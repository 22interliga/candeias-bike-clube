# Controle Central do Candeias Bike Clube

## CMD-CBC-010 — Integração Firebase

| Item | Situação |
| --- | --- |
| Fonte e versão aprovada | GitHub `22interliga/candeias-bike-clube`, `main` em `4f10c37`. GitHub Pages preservado. |
| Branch de integração | `cmd-cbc-010/firebase`. Histórico, arquivos e decisões em `MEMORIA.md`. |
| Integração local | Auth, regras, módulos Firestore e Hosting/PWA preparados. |
| Validação | Suíte de regras/CRUD em emuladores e navegação/responsividade no navegador concluídas com dados fictícios. |
| Produção | Aguardando a configuração registrada, conferência dos dados existentes e autorização expressa. |

### Prévia verificável

Com Node.js, Firebase CLI e Java 21 disponíveis, execute na raiz:

```sh
node preparar-hosting.mjs --previa
firebase emulators:start --project demo-cbc --only auth,firestore,hosting
```

Abra `http://127.0.0.1:5000/`. Para testar o painel de forma interativa, use a interface dos emuladores em `http://127.0.0.1:4000/` para criar uma conta de teste por e-mail/senha e o documento `administradores/{uid}`. Defina `cargo` como string `administrador_geral` e `ativo` como booleano `true`. O app aponta para os emuladores em `localhost` e `127.0.0.1`.

Com os emuladores em execução, rode `node testes/emuladores.mjs`. A suíte inclui contas e dados de teste, todos restritos ao projeto `demo-cbc`. O emulador é descartável. Os testes no navegador usaram uma conta fictícia distinta e verificaram o fluxo real da interface. O Hosting serve uma lista explícita de arquivos estáticos e o PWA mantém o cache apenas para o shell público. A navegação usa seções de uma página, sem rotas profundas que precisem de rewrite.

### Antes da publicação oficial

1. Reautenticar o CLI com uma conta autorizada e conferir o projeto `candeias-bike-clube`, o plano Spark, o site do Hosting, a edição do Firestore e os domínios autorizados. Usar sempre `--project candeias-bike-clube` nas operações reais.
2. Copiar o objeto `firebaseConfig` do **app web já registrado**, em formato JSON, para `firebase-web.json` na raiz. O arquivo fica ignorado pelo Git. A configuração web pública acompanha o build do Hosting; chaves privadas, senhas, tokens e contas de serviço ficam fora dele.
3. Conferir e exportar com acesso autorizado os dados e regras que já existirem. Revisar os documentos das coleções públicas para que contenham apenas os campos do novo esquema. Ajustar eventuais documentos antigos aos esquemas das regras, incluindo o contador de inscrições, `fimInscricoes`, `ativo`, e a separação de PIX e WhatsApp. A versão aprovada grava dados por navegador no modo local. Se houver registros válidos nesses aparelhos, fazer a migração controlada a partir de um backup autorizado. O site integrado não lê nem envia os registros locais antigos automaticamente.
4. Após autorização, habilitar e-mail/senha para a diretoria e provedor anônimo para os três formulários públicos. Cadastrar a primeira conta administrativa pelo Firebase Console e criar `administradores/{uid}` pelo console com os dois campos indicados acima. Revogar o acesso alterando `ativo` para `false` por via administrativa. Demais cargos institucionais permanecem sem acesso ao painel nesta etapa.
5. Gerar o pacote com `node preparar-hosting.mjs`. Após autorização para alterar regras reais, publicar com `firebase deploy --project candeias-bike-clube --only firestore:rules`. O canal temporário, se autorizado, usa o backend real e é publicamente acessível a quem tiver o link. Após a conferência final e autorização para o canal oficial, executar `firebase deploy --project candeias-bike-clube --only hosting`. Manter GitHub Pages em sua fonte aprovada.
6. Conferir a versão e o funcionamento com dados de validação autorizados. Registrar os releases. Caso seja necessário reverter, selecionar a versão anterior de Hosting e usar o conjunto anterior de regras previamente revisado, preservando os dados e o site aprovado.

### Escopo da autorização

A diretoria opera pelos fluxos existentes com o cargo inicial único. A autorização é conferida no Firestore em todas as operações privadas. O acesso público a associação, inscrições e pedidos é de criação restrita. O usuário anônimo recebe um UID por sessão, sem permissão de ler dados enviados. A lotação é aplicada pelo Firestore; a identidade anônima não comprova a posse do telefone informado. Pedidos registram a solicitação e o painel atualiza seu estado; a integração não processa pagamento.

Referências de publicação e prévia [Firebase Hosting](https://firebase.google.com/docs/hosting/test-preview-deploy) e [Emulator Suite](https://firebase.google.com/docs/emulator-suite/install_and_configure).

## CMD-CBC-011 — Preparação final

### Resultado das verificações

| Item | Resultado |
| --- | --- |
| Configuração e build | O objeto web fornecido foi gravado em `firebase-web.json`, ignorado pelo Git. `node preparar-hosting.mjs` produziu nove arquivos autorizados em `dist`. A cópia da configuração é idêntica à original e contém apenas os seis campos web fornecidos. |
| Identidade do projeto | Consulta pública de configuração do Firebase Auth retornou HTTP 200 e confirmou o número do projeto e o domínio `candeias-bike-clube.firebaseapp.com`. Esse endpoint não informa o estado dos provedores. |
| Firestore atual | A resposta do CLI identificou `(default)` como Standard nativo. O CLI informou credenciais inválidas na sessão, o gcloud não emitiu token e o Console solicitou login. Não foi possível inventariar os documentos nem obter as regras ativas para rollback. |
| Administrador Geral | O histórico de implantação registra um administrador já cadastrado. Para ser compatível, o UID da conta existente no Auth deve ser o ID do documento `administradores/{uid}`, com `cargo` string `administrador_geral` e `ativo` booleano `true`. As operações administrativas exigem sessão do provedor `password`. A correspondência dos dados reais permanece sem verificação. |
| Provedores | O histórico registra e-mail/senha habilitado. Falta confirmar que continua ativo. O provedor Anônimo precisa estar habilitado para os formulários públicos de associação, inscrição e pedido. Sua ativação não foi confirmada nem executada. |
| Dados locais legados | O código aprovado lê oito chaves `cbc_*` em `localStorage`, por origem e perfil. Não foi localizado backup CBC no escopo pesquisável de Downloads e da área de trabalho Codex. O conteúdo dos perfis que usaram o site ainda precisa de inventário. A ausência de backup localizado não indica armazenamento vazio. |

A suíte já aprovada no CMD-CBC-010 foi preservada. Nesta etapa foram verificados somente a configuração, o empacotamento e a evidência disponível para as pendências. Não houve deploy, publicação de regras, alteração de provedores, dados, plano, `main` ou GitHub Pages.

### Condições antes de autorizar a publicação

1. Com sessão autorizada, identificar o UID do Administrador Geral já cadastrado no Auth e conferir somente o documento daquele UID. Verificar os dois campos e seus tipos e confirmar o provedor e-mail/senha. Não criar uma conta duplicada.
2. No Firestore, inventariar coleções e tipos de dados sem editar documentos. Antes de expor coleções públicas, confirmar que galeria, agenda e catálogo legados contêm somente campos publicáveis. Conferir `ativo`, `confirmados`, `fimInscricoes`, identificadores de inscrição, estados e a separação da chave PIX do WhatsApp público.
3. Inventariar cada navegador e perfil que usou a versão aprovada, na origem do GitHub Pages ou na origem local em que foi executada. As chaves são `cbc_pedais`, `cbc_eventos`, `cbc_membros`, `cbc_inscricoes`, `cbc_galeria`, `cbc_produtos`, `cbc_pedidos` e `cbc_config`. Registrar presença, contagem e forma dos registros sem copiar dados pessoais, PIX ou PIN para o repositório. A migração, se necessária, é uma etapa separada.
4. Salvar a fonte do conjunto de regras atualmente publicado e seu identificador em pasta local fora de `dist`. Registrar a versão anterior do canal live do Hosting, se existir. Se for a primeira publicação, registrar a ausência de versão anterior e combinar a reversão antes de publicar.
5. Com autorização expressa, conferir ou habilitar Anônimo no Firebase Auth antes de liberar os formulários públicos. Manter e-mail/senha habilitado para a diretoria.

### Comandos preparados para execução após autorização

Na raiz da branch, com o CLI autenticado e o projeto confirmado:

```sh
node preparar-hosting.mjs
firebase deploy --project candeias-bike-clube --only firestore:rules
firebase deploy --project candeias-bike-clube --only hosting
```

Publicar Hosting somente após a confirmação das regras e dos provedores. Após o deploy autorizado, conferir o site publicado e os registros de release do Firebase. GitHub Pages é uma publicação independente.

### Rollback preparado

- **Hosting:** no Firebase Console, abrir Hosting e restaurar a versão live anterior no histórico de releases. Se não houver versão anterior, usar somente o procedimento de reversão acordado antes da primeira publicação. [Documentação do Firebase Hosting](https://firebase.google.com/docs/hosting/manage-hosting-resources)
- **Firestore:** usar a fonte arquivada da versão efetivamente ativa antes do deploy. Preparar nessa pasta um `firebase.json` que aponte para o arquivo local `firestore.rules`. A partir dessa pasta, executar `firebase deploy --project candeias-bike-clube --only firestore:rules` após autorização de rollback. A reversão de regras não desfaz gravações de dados. [Documentação das regras do Firebase](https://firebase.google.com/docs/rules/manage-deploy)
- **Provedores:** se Anônimo tiver sido habilitado nesta implantação e for necessário revertê-lo, restaurar o estado anterior documentado após autorização. Preservar o acesso por e-mail/senha da diretoria.

## CMD-CBC-012 — Verificação de liberação em 24/11/2026

| Verificação | Resultado |
| --- | --- |
| Projeto e faturamento | `candeias-bike-clube`; faturamento desvinculado, compatível com Spark. |
| Authentication | Provedores e-mail/senha e Anônimo confirmados habilitados. |
| Administrador Geral | A conta esperada está habilitada e usa senha. O documento tem o mesmo UID, cargo como string `administrador_geral` e `ativo` como booleano `true`. Compatível com as condições das regras propostas. |
| Firestore | Só a coleção raiz `administradores`, com um documento. Nenhuma coleção operacional CBC. Consultas somente leitura. |
| Regras e rollback | Revisão vigente `cef625c2-cb28-4a85-8c34-985131e449fd` arquivada em `work/cbc12-rollback`, fora do repositório e do pacote de Hosting. O site Firebase ainda não tem release live. |
| LocalStorage | Edge Default e Chrome Default, Profile 1 e Profile 2 lidos sem alteração. Nenhuma chave ativa entre as oito esperadas nas origens GitHub Pages, Firebase Hosting, localhost e arquivo local. O acesso ao navegador integrado falhou; outros dispositivos, perfis e origens não identificadas ficam fora do inventário. |

**Decisão:** publicação bloqueada enquanto o perfil integrado permanecer sem verificação. O inventário das origens e perfis examinados não foi extrapolado.

### Sequência após sanar o impedimento e receber autorização expressa

1. Confirmar o inventário legado e que a revisão vigente ainda corresponde à cópia arquivada. Se houver registros, manter a publicação bloqueada até decidir como preservá-los. Conferir que o site oficial continua em GitHub Pages e que o Firebase Hosting ainda não tem release live.
2. Na raiz da branch, executar `node preparar-hosting.mjs`, depois `firebase deploy --project candeias-bike-clube --only firestore:rules` e, após verificar a publicação das regras, `firebase deploy --project candeias-bike-clube --only hosting`.
3. Registrar os releases e conferir os fluxos publicados apenas com dados autorizados.

### Recuperação da primeira publicação

- Se for preciso voltar ao estado anterior sem release live, executar `firebase hosting:disable --project candeias-bike-clube --site candeias-bike-clube`, após autorização de rollback. Isso interrompe somente a publicação Firebase Hosting. A versão aprovada continua no GitHub Pages. [Referência do Firebase CLI](https://firebase.google.com/docs/cli/#hosting_commands)
- Para restaurar o comportamento das regras anteriores, executar `firebase deploy --project candeias-bike-clube --only firestore:rules` a partir da pasta local `work/cbc12-rollback`, que contém a fonte arquivada e o `firebase.json` correspondente, após autorização de rollback. Essa operação não revoga gravações feitas entre releases. Os provedores já estavam habilitados no estado anterior. [Referência de implantação de regras](https://firebase.google.com/docs/rules/manage-deploy)
