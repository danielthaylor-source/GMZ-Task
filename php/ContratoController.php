<?php
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

namespace App\Http\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Kreait\Firebase\Contract\Firestore as FirebaseFirestore;
use Kreait\Firebase\Contract\Storage as FirebaseStorage;

class ContratoController {

    private $firestore;
    private $storage;

    public function __construct(FirebaseFirestore $firestore, FirebaseStorage $storage) {
        $this->firestore = $firestore;
        $this->storage = $storage;
    }

    /**
     * GET /api/contratos
     */
    public function index(Request $request, Response $response) {
        $database = $this->firestore->database();
        $contratosRef = $database->collection('contratos');
        $documents = $contratosRef->documents();
        
        $data = [];
        foreach ($documents as $doc) {
            if ($doc->exists()) {
                $item = $doc->data();
                $item['id'] = $doc->id();
                $data[] = $item;
            }
        }

        $response->getBody()->write(json_encode($data));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    }

    /**
     * POST /api/contratos
     * Com upload integrado ao Firebase Storage (Contrato corporativo)
     */
    public function create(Request $request, Response $response) {
        $body = $request->getParsedBody();
        $database = $this->firestore->database();
        
        // Valida campos obrigatórios
        if (empty($body['nome']) || empty($body['numero']) || empty($body['empresaIds'])) {
            $response->getBody()->write(json_encode([
                "status" => "error",
                "message" => "Os campos nome, numero e ao menos uma empresa vinculada são obrigatórios"
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        // Lógica de manipulação de uploads com o Firebase Storage integrado
        $uploadedAnexos = [];
        $uploadedFiles = $request->getUploadedFiles(); // Slim PSR-7
        
        if (!empty($uploadedFiles['anexos'])) {
            $bucket = $this->storage->getBucket();
            $folderId = $body['folderId'] ?? 'uncategorized';

            foreach ($uploadedFiles['anexos'] as $file) {
                if ($file->getError() === UPLOAD_ERR_OK) {
                    $fileName = $file->getClientFilename();
                    $destinationPath = "contratos/{$folderId}/" . uniqid() . "_" . $fileName;
                    
                    // Upload para o Firebase Storage Bucket
                    $object = $bucket->upload($file->getStream(), [
                        'name' => $destinationPath,
                        'predefinedAcl' => 'publicRead'
                    ]);

                    $uploadedAnexos[] = [
                        "name" => $fileName,
                        "url" => $object->info()['mediaLink'] ?? '',
                        "size" => $this->formatBytes($file->getSize())
                    ];
                }
            }
        }

        // Prepara dados NoSQL
        $contratoData = [
            "numero" => $body['numero'],
            "nome" => $body['nome'],
            "sla" => $body['sla'] ?? "24h",
            "valorTotal" => (float)($body['valorTotal'] ?? 0),
            "valorCobranca" => (float)($body['valorCobranca'] ?? 0),
            "periodoCobranca" => $body['periodoCobranca'] ?? "Mensal",
            "dataInicio" => $body['dataInicio'] ?? date('Y-m-d'),
            "dataFim" => $body['dataFim'] ?? date('Y-m-d', strtotime('+1 year')),
            "status" => $body['status'] ?? "Rascunho",
            "empresaIds" => (array)$body['empresaIds'], // Seleção Múltipla vinculada no Firestore
            "folderId" => $body['folderId'] ?? 'drive-folder-' . uniqid(),
            "anexos" => $uploadedAnexos
        ];

        $contratosRef = $database->collection('contratos');
        $newDoc = $contratosRef->add($contratoData);

        $response->getBody()->write(json_encode([
            "status" => "success",
            "id" => $newDoc->id(),
            "message" => "Contrato corporativo criado com sucesso e arquivos anexados ao Storage!"
        ]));
        
        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    }

    /**
     * DELETE /api/contratos/{id}
     */
    public function delete(Request $request, Response $response, array $args) {
        $id = $args['id'] ?? null;
        if (!$id) {
            $response->getBody()->write(json_encode(["status" => "error", "message" => "ID inválido"]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        $database = $this->firestore->database();
        $contratoRef = $database->collection('contratos')->document($id);
        
        if (!$contratoRef->snapshot()->exists()) {
            $response->getBody()->write(json_encode(["status" => "error", "message" => "Contrato não encontrado"]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $contratoRef->delete();

        $response->getBody()->write(json_encode([
            "status" => "success", 
            "message" => "Contrato removido com sucesso de todas as referências do Firestore"
        ]));
        return $response->withHeader('Content-Type', 'application/json')->withStatus(200);
    }

    private function formatBytes($bytes, $precision = 2) {
        $units = array('B', 'KB', 'MB', 'GB', 'TB');
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= pow(1024, $pow);
        return round($bytes, $precision) . ' ' . $units[$pow];
    }
}
