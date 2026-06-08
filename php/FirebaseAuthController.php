<?php
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

namespace App\Http\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Kreait\Firebase\Contract\Auth as FirebaseAuth;
use Kreait\Firebase\Contract\Firestore as FirebaseFirestore;

class FirebaseAuthController {
    
    private $auth;
    private $firestore;

    public function __construct(FirebaseAuth $auth, FirebaseFirestore $firestore) {
        $this->auth = $auth;
        $this->firestore = $firestore;
    }

    /**
     * POST /api/auth/login
     * Recebe o idToken do Google obtido no Frontend via Firebase Auth Client
     */
    public function login(Request $request, Response $response) {
        $body = $request->getParsedBody();
        $idToken = $body['idToken'] ?? null;

        if (!$idToken) {
            $response->getBody()->write(json_encode([
                "status" => "error", 
                "message" => "O ID Token do Google/Firebase é obrigatório"
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        try {
            // 1. Verifica o ID Token no PHP usando o Firebase Admin SDK
            $verifiedIdToken = $this->auth->verifyIdToken($idToken);
            $uid = $verifiedIdToken->claims()->get('sub');
            $userEmail = $verifiedIdToken->claims()->get('email');
            
            // 2. Busca na tabela/coleção "pessoas" pelo email cadastrado
            $database = $this->firestore->database();
            $pessoasRef = $database->collection('pessoas');
            $query = $pessoasRef->where('email', '=', $userEmail)->limit(1);
            $snapshots = $query->documents();
            
            $pessoaEncontrada = null;
            $idPessoa = null;

            foreach ($snapshots as $doc) {
                if ($doc->exists()) {
                    $pessoaEncontrada = $doc->data();
                    $idPessoa = $doc->id();
                    $pessoaEncontrada['id'] = $idPessoa;
                    break;
                }
            }

            if (!$pessoaEncontrada) {
                $response->getBody()->write(json_encode([
                    "status" => "unregistered",
                    "message" => "Seu e-mail foi autenticado com sucesso via Google, mas você ainda não está cadastrado neste ERP. Consulte um Administrador.",
                    "email" => $userEmail
                ]));
                return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
            }

            // 3. Busca os módulos permitidos na coleção "acessos" vinculados ao ID do usuário
            $acessosRef = $database->collection('acessos');
            $acessosQuery = $acessosRef->where('id_pessoa', '=', $idPessoa)->limit(1);
            $acessosSnapshots = $acessosQuery->documents();
            $modulosPermitidos = [];

            foreach ($acessosSnapshots as $aDoc) {
                if ($aDoc->exists()) {
                    $modulosPermitidos = $aDoc->data()['modulos'] ?? [];
                    break;
                }
            }

            // 4. Retorna a sessão bem-sucedida montada com RBAC direto
            $payload = json_encode([
                "status" => "success",
                "pessoa" => $pessoaEncontrada,
                "uid" => $uid,
                "acessos" => $modulosPermitidos
            ]);

            $response->getBody()->write($payload);
            return $response->withHeader('Content-Type', 'application/json')->withStatus(200);

        } catch (\Exception $e) {
            $response->getBody()->write(json_encode([
                "status" => "error",
                "message" => "Sua autenticação expirou ou falhou: " . $e->getMessage()
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
        }
    }
}
