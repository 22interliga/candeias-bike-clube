import assert from 'node:assert/strict';

const projeto = 'demo-cbc';
const auth = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1';
const raiz = 'projects/' + projeto + '/databases/(default)/documents';
const firestore = 'http://127.0.0.1:8080/v1/' + raiz;
const numeroTeste = Date.now();
const senha = 'Exclusiva-Emulador-123!';
const email = tipo => 'cbc-' + tipo + '-' + numeroTeste + '@example.test';

async function chamada(url, metodo = 'GET', corpo, token) {
  const resposta = await fetch(url, {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {})
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo)
  });
  return { status: resposta.status, dados: await resposta.json() };
}

async function confirmar(promessa, status, descricao) {
  const resposta = await promessa;
  assert.equal(resposta.status, status, descricao + ': ' + JSON.stringify(resposta.dados));
  return resposta.dados;
}

function campos(objeto) {
  return Object.fromEntries(Object.entries(objeto).map(([chave, valor]) => [chave, campo(valor)]));
}

function campo(valor) {
  if (valor instanceof Date) return { timestampValue: valor.toISOString() };
  if (valor === null) return { nullValue: null };
  if (typeof valor === 'string') return { stringValue: valor };
  if (typeof valor === 'boolean') return { booleanValue: valor };
  if (typeof valor === 'number') return Number.isInteger(valor) ? { integerValue: valor } : { doubleValue: valor };
  return { mapValue: { fields: campos(valor) } };
}

function escrita(caminho, dados, opcoes = {}) {
  const update = { name: raiz + '/' + caminho, fields: campos(dados) };
  const resultado = { update };
  if (opcoes.criar) {
    resultado.currentDocument = { exists: false };
    resultado.updateTransforms = [{ fieldPath: 'criadoEm', setToServerValue: 'REQUEST_TIME' }];
  }
  if (opcoes.parcial) resultado.updateMask = { fieldPaths: Object.keys(dados) };
  return resultado;
}

const gravar = (token, ...writes) => chamada(firestore + ':commit', 'POST', { writes }, token);
const ler = (caminho, token) => chamada(firestore + '/' + caminho, 'GET', undefined, token);
const autenticar = (op, corpo) => chamada(auth + '/accounts:' + op + '?key=demo-cbc', 'POST', {
  ...corpo, returnSecureToken: true
});

const cadastroAdmin = await confirmar(autenticar('signUp', { email: email('admin'), password: senha }), 200, 'Criar admin fictício');
const visitante = await confirmar(autenticar('signUp', {}), 200, 'Criar sessão pública');
const outro = await confirmar(autenticar('signUp', { email: email('inativo'), password: senha }), 200, 'Criar conta inativa');
const token = visitante.idToken;
const uid = visitante.localId;
const adminPath = 'administradores/' + cadastroAdmin.localId;

await confirmar(gravar('owner',
  escrita(adminPath, { cargo: 'administrador_geral', ativo: true }),
  escrita('administradores/' + outro.localId, { cargo: 'administrador_geral', ativo: false })
), 200, 'Preparar cargos somente no emulador');
await confirmar(autenticar('signInWithPassword', { email: email('admin'), password: 'senha-incorreta' }), 400, 'Senha incorreta');
const admin = (await confirmar(autenticar('signInWithPassword', { email: email('admin'), password: senha }), 200, 'Login por e-mail/senha')).idToken;
await confirmar(ler(adminPath, admin), 200, 'Admin consulta seu cargo');
await confirmar(ler(adminPath, token), 403, 'Visitante não consulta cargo alheio');
await confirmar(gravar(token, escrita('administradores/' + uid, { cargo: 'administrador_geral', ativo: true })), 403, 'Bloquear autoelevação');
await confirmar(gravar(admin, escrita(adminPath, { ativo: false }, { parcial: true })), 403, 'Admin não altera permissões pelo cliente');

const membroPath = 'cbc_membros/' + uid;
const membro = { uid, nome: 'Associado fictício', fone: '75999990000', nivel: 'Iniciante', bike: '', obs: '', status: 'pendente', pagos: {} };
await confirmar(gravar(token, escrita(membroPath, { ...membro, status: 'ativo' }, { criar: true })), 403, 'Bloquear aprovação pelo visitante');
await confirmar(gravar(token, escrita(membroPath + '_outro', membro, { criar: true })), 403, 'Bloquear troca de UID');
await confirmar(gravar(token, escrita(membroPath, membro, { criar: true })), 200, 'Solicitar associação');
await confirmar(ler(membroPath), 403, 'Leitura pública de membro');
await confirmar(ler('cbc_membros', token), 403, 'Listagem privada de associados');
await confirmar(ler(membroPath, token), 403, 'Leitura privada pelo remetente');
await confirmar(ler(membroPath, outro.idToken), 403, 'Leitura de membro por conta inativa');
await confirmar(gravar(admin, escrita(membroPath, { status: 'ativo' }, { parcial: true })), 200, 'Aprovar associado');
await confirmar(gravar(admin, escrita(membroPath, { pagos: { '2090-01': new Date() } }, { parcial: true })), 200, 'Registrar mensalidade');
await confirmar(gravar(token, escrita(membroPath, { pagos: {} }, { parcial: true })), 403, 'Visitante não altera pagamentos');
await confirmar(ler(membroPath, admin), 200, 'Admin lê membro');

const agendaId = 'pedal_' + numeroTeste;
const agendaPath = 'cbc_pedais/' + agendaId;
const agenda = {
  titulo: 'Pedal fictício', data: '2090-08-01', hora: '07:00', local: 'Praça de teste',
  vagas: 1, descricao: '', ativo: true, confirmados: 0, distancia: 20,
  nivel: 'Todos', fimInscricoes: new Date('2090-08-02T03:00:00Z')
};
await confirmar(gravar(admin, escrita(agendaPath, agenda, { criar: true })), 200, 'Criar pedal');
await confirmar(gravar(admin, escrita(agendaPath, { local: 'Nova praça' }, { parcial: true })), 200, 'Editar pedal');
await confirmar(gravar(admin, escrita(agendaPath, { titulo: 'A'.repeat(161) }, { parcial: true })), 403, 'Limitar campo na edição');
await confirmar(ler(agendaPath), 200, 'Ler pedal público');
const inscPath = 'cbc_inscricoes/pedal_' + agendaId + '_' + uid;
const inscricao = { uid, tipo: 'pedal', refId: agendaId, nome: membro.nome, fone: membro.fone, pago: false };
const subirContador = { transform: { document: raiz + '/' + agendaPath, fieldTransforms: [{ fieldPath: 'confirmados', increment: campo(1) }] } };
await confirmar(gravar(token, subirContador), 403, 'Impedir contador sem inscrição');
await confirmar(gravar(token, escrita(inscPath, inscricao, { criar: true })), 403, 'Impedir inscrição sem contador');
await confirmar(gravar(token, escrita(inscPath, inscricao, { criar: true }), subirContador), 200, 'Inscrição e contador atômicos');
await confirmar(gravar(token, escrita(inscPath, inscricao, { criar: true }), subirContador), 403, 'Impedir inscrição repetida');
const segundaInsc = { ...inscricao, uid: outro.localId };
await confirmar(gravar(outro.idToken, escrita('cbc_inscricoes/pedal_' + agendaId + '_' + outro.localId, segundaInsc, { criar: true }), subirContador), 403, 'Impedir lotação excedida');
await confirmar(ler(inscPath), 403, 'Inscrição privada');
await confirmar(gravar(admin, escrita(inscPath, { pago: true }, { parcial: true })), 200, 'Registrar pagamento da inscrição');
await confirmar(gravar(admin, { delete: raiz + '/' + inscPath }, escrita(agendaPath, { confirmados: 0 }, { parcial: true })), 200, 'Remover inscrição e devolver vaga');
await confirmar(gravar(admin, escrita(agendaPath, { ativo: false }, { parcial: true })), 200, 'Arquivar pedal');
await confirmar(ler(agendaPath), 403, 'Ocultar pedal arquivado');
const eventoPath = 'cbc_eventos/evento_' + numeroTeste;
const { distancia, nivel, ...evento } = agenda;
await confirmar(gravar(admin, escrita(eventoPath, { ...evento, valor: 25 }, { criar: true })), 200, 'Criar evento');

const produtoId = 'produto_' + numeroTeste;
const produtoPath = 'cbc_produtos/' + produtoId;
const produto = { nome: 'Camisa', preco: 25.25, tamanhos: 'P,M,G', descricao: '', img: '', ativo: true };
await confirmar(gravar(admin, escrita(produtoPath, { ...produto, pix: 'privado' }, { criar: true })), 403, 'Impedir campo privado em documento público');
await confirmar(gravar(admin, escrita(produtoPath, produto, { criar: true })), 200, 'Criar produto');
const pedidoPath = 'cbc_pedidos/pedido_' + numeroTeste;
const pedido = { uid, produto: produto.nome, produtoId, qtd: 2, total: 50.50, tamanho: 'M', nome: membro.nome, fone: membro.fone, status: 'novo' };
await confirmar(gravar(token, escrita(pedidoPath, { ...pedido, total: 1 }, { criar: true })), 403, 'Bloquear preço adulterado');
await confirmar(gravar(token, escrita(pedidoPath, { ...pedido, tamanho: 'GG' }, { criar: true })), 403, 'Bloquear tamanho inexistente');
await confirmar(gravar(token, escrita(pedidoPath, pedido, { criar: true })), 200, 'Enviar pedido');
await confirmar(ler(pedidoPath, token), 403, 'Pedido privado');
await confirmar(gravar(admin, escrita(pedidoPath, { status: 'pago' }, { parcial: true })), 200, 'Atualizar pedido');
await confirmar(gravar(admin, { delete: raiz + '/' + pedidoPath }), 200, 'Excluir pedido');
await confirmar(gravar(admin, escrita(produtoPath, { ativo: false }, { parcial: true })), 200, 'Desativar produto');
await confirmar(ler(produtoPath), 403, 'Produto inativo privado');

const fotoPath = 'cbc_galeria/foto_' + numeroTeste;
await confirmar(gravar(admin, escrita(fotoPath, { img: 'data:image/jpeg;base64,/9j/2Q==', legenda: 'Foto fictícia' }, { criar: true })), 200, 'Cadastrar imagem');
await confirmar(ler(fotoPath), 200, 'Galeria pública');
await confirmar(gravar(admin, { delete: raiz + '/' + fotoPath }), 200, 'Excluir foto');

await confirmar(gravar(admin, escrita('cbc_config/geral', { mensalidade: 30, pix: 'chave-ficticia' }),
  escrita('cbc_config/publico', { zap: '75999990000' })), 200, 'Separar configurações pública e privada');
await confirmar(ler('cbc_config/geral'), 403, 'PIX e mensalidade privados');
await confirmar(ler('cbc_config/publico'), 200, 'WhatsApp institucional público');
await confirmar(gravar('owner', escrita(adminPath, { ativo: false }, { parcial: true })), 200, 'Revogar admin no emulador');
await confirmar(ler(membroPath, admin), 403, 'Revogação vale para token já emitido');
console.log('PASSOU: autenticação, permissões e CRUD dos fluxos CBC no projeto demo-cbc.');
