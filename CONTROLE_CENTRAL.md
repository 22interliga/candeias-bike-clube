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
