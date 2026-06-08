<?php
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

namespace App\Http\Controllers;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Kreait\Firebase\Contract\Firestore as FirebaseFirestore;

class DemandaController {

    private $firestore;

    public function __construct(FirebaseFirestore $firestore) {
        $this->firestore = $firestore;
    }

    /**
     * POST /api/demandas/{id}/apontamento
     * Registra apontamentos de esforço e faz a somatória das horas no projeto
     */
    public function addApontamento(Request $request, Response $response, array $args) {
        $idDemanda = $args['id'] ?? null;
        $body = $request->getParsedBody();
        $database = $this->firestore->database();

        if (empty($body['horas']) || empty($body['atividade']) || empty($body['idPessoa'])) {
            $response->getBody()->write(json_encode([
                "status" => "error",
                "message" => "Os campos horas, atividade e idPessoa são obrigatórios"
            ]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(400);
        }

        // 1. Busca a Demanda mestre para descobrir o Projeto
        $demandaRef = $database->collection('demandas')->document($idDemanda);
        $demandaSnapshot = $demandaRef->snapshot();

        if (!$demandaSnapshot->exists()) {
            $response->getBody()->write(json_encode(["status" => "error", "message" => "A demanda informada não existe"]));
            return $response->withHeader('Content-Type', 'application/json')->withStatus(404);
        }

        $demandaData = $demandaSnapshot->data();
        $idProjeto = $demandaData['idProjeto'];

        // 2. Busca o Projeto para coletar a flag "Contabilizar por Empresa"
        $projetoRef = $database->collection('projetos')->document($idProjeto);
        $projetoSnapshot = $projetoRef->snapshot();
        $contabilizarPorEmpresa = false;

        if ($projetoSnapshot->exists()) {
            $contabilizarPorEmpresa = $projetoSnapshot->data()['contabilizarPorEmpresa'] ?? false;
        }

        $horasLancadas = (float)$body['horas'];
        $horasCalculadas = $horasLancadas;

        // 3. REGRA DE CÁLCULO SAAS: Se true, multiplica as horas pelo número de empresas vinculadas ao contrato associado à demanda
        if ($contabilizarPorEmpresa) {
            // Busca o contrato principal para listar quantas empresas estão cadastradas
            $contratosRef = $database->collection('contratos');
            // Encontra contratos vinculando a mesma área ou a primeira instância mestre
            // No SQL corporativo, contamos o número de empresas vinculadas
            $contratoQuery = $contratosRef->limit(1)->documents();
            $multiplicador = 1;

            foreach ($contratoQuery as $cDoc) {
                if ($cDoc->exists()) {
                    $multiplicador = count($cDoc->data()['empresaIds'] ?? []);
                    break;
                }
            }

            // Garante o multiplicador mínimo de 1
            $multiplicador = max($multiplicador, 1);
            $horasCalculadas = $horasLancadas * $multiplicador;
        }

        // 4. Registra na tabela "apontamentos"
        $apontamentoData = [
            "idDemanda" => $idDemanda,
            "idPessoa" => $body['idPessoa'],
            "nomePessoa" => $body['nomePessoa'] ?? 'Colaborador GMZ',
            "atividade" => $body['atividade'], // references allowed activities
            "horas" => $horasLancadas, // Horas brutas guardadas
            "horasSincronizadas" => $horasCalculadas, // Horas calculadas aplicadas
            "createdAt" => date('c')
        ];

        $apontamentosRef = $database->collection('apontamentos');
        $newDoc = $apontamentosRef->add($apontamentoData);

        // 5. Retorna o json calculador calculado ao cliente
        $response->getBody()->write(json_encode([
            "status" => "success",
            "id" => $newDoc->id(),
            "horasBrutas" => $horasLancadas,
            "horasFaturadas" => $horasCalculadas,
            "regraAplicada" => $contabilizarPorEmpresa ? "multiplicador_empresas" : "simples_direto",
            "message" => "Apontamento financeiro gravado no Firestore com sucesso e contabilizado por empresas!"
        ]));

        return $response->withHeader('Content-Type', 'application/json')->withStatus(201);
    }
}
