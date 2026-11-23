import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  initializeAuth, browserSessionPersistence, connectAuthEmulator, signInAnonymously,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore, connectFirestoreEmulator, collection, doc, query, where,
  addDoc, updateDoc, deleteDoc, getDoc, getDocs, serverTimestamp, setDoc,
  writeBatch, runTransaction, increment, deleteField, FieldPath, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-lite.js';

export const modulosPublicos = ['pedais', 'eventos', 'galeria', 'produtos'];
export const modulosPrivados = ['membros', 'inscricoes', 'pedidos'];
const projeto = 'candeias-bike-clube';
const local = ['localhost', '127.0.0.1'].includes(location.hostname);
async function configuracao() {
  if (local) return { projectId: 'demo-cbc', apiKey: 'demo-cbc' };
  const resposta = await fetch(new URL('./firebase-web.json', import.meta.url), { cache: 'no-store' });
  if (!resposta.ok) throw new Error('Configuração web indisponível');
  const config = await resposta.json();
  if (config.projectId !== projeto || !config.apiKey || !config.appId || !config.authDomain) {
    throw new Error('Configuração web inválida');
  }
  return config;
}

export async function conectar() {
  const app = initializeApp(await configuracao());
  const auth = initializeAuth(app, { persistence: browserSessionPersistence });
  const db = getFirestore(app);
  if (local) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }

  const colecao = nome => collection(db, 'cbc_' + nome);
  const ref = (nome, id) => doc(colecao(nome), id);
  const cargo = uid => doc(db, 'administradores', uid);
  const autorizado = snap => snap.exists() && snap.data().cargo === 'administrador_geral' && snap.data().ativo === true;
  const dados = snap => snap.docs.filter(d => /^[A-Za-z0-9_-]{1,180}$/.test(d.id))
    .map(d => ({ ...d.data(), id: d.id }));
  function camposAgenda(nome, dados) {
    if (!['pedais', 'eventos'].includes(nome) || !dados.data) return dados;
    const fim = new Date(dados.data + 'T03:00:00Z');
    fim.setUTCDate(fim.getUTCDate() + 1);
    return { ...dados, fimInscricoes: Timestamp.fromDate(fim) };
  }
  const observadores = new Set();
  function acompanhar(nome, ler, receber, falhar) {
    let ativo = true;
    let versao = 0;
    const observador = { nome, async atualizar() {
      const atual = ++versao;
      try {
        const valor = await ler();
        if (ativo && atual === versao) receber(valor);
      } catch (erro) {
        if (ativo && atual === versao) falhar(erro);
      }
    } };
    observadores.add(observador);
    void observador.atualizar();
    return () => { ativo = false; observadores.delete(observador); };
  }
  function atualizar(...nomes) {
    for (const observador of observadores) {
      if (!nomes.length || nomes.includes(observador.nome)) void observador.atualizar();
    }
  }
  async function gravar(operacao, ...nomes) {
    await operacao;
    atualizar(...nomes);
  }
  let anonimo;
  async function identidade() {
    await auth.authStateReady();
    if (auth.currentUser) return auth.currentUser.uid;
    anonimo ??= signInAnonymously(auth).finally(() => { anonimo = undefined; });
    return (await anonimo).user.uid;
  }

  return {
    atualizar,
    async entrar(email, senha) {
      const { user } = await signInWithEmailAndPassword(auth, email, senha);
      try {
        if (!autorizado(await getDoc(cargo(user.uid)))) throw new Error('Sem acesso ao painel');
      } catch (erro) {
        await signOut(auth);
        throw erro;
      }
    },
    sair: () => signOut(auth),
    observarSessao(callback) {
      let pararCargo;
      let timer;
      window.addEventListener('focus', () => atualizar());
      return onAuthStateChanged(auth, user => {
        pararCargo?.();
        clearInterval(timer);
        callback(false);
        if (!user || user.isAnonymous) return;
        pararCargo = acompanhar('cargo', () => getDoc(cargo(user.uid)),
          snap => callback(autorizado(snap)), () => callback(false));
        timer = setInterval(() => {
          if (!document.hidden) atualizar('cargo');
        }, 30000);
      });
    },
    observarLista(nome, publico, receber, falhar) {
      const origem = publico && ['pedais', 'eventos', 'produtos'].includes(nome)
        ? query(colecao(nome), where('ativo', '==', true))
        : colecao(nome);
      return acompanhar(nome, async () => dados(await getDocs(origem)), receber, falhar);
    },
    observarConfig(publico, receber, falhar) {
      return acompanhar('config', async () => (await getDoc(ref('config', publico ? 'publico' : 'geral'))).data() || {},
        receber, falhar);
    },
    async enviarCadastro(dados) {
      const uid = await identidade();
      await gravar(setDoc(ref('membros', uid), { ...dados, uid, criadoEm: serverTimestamp() }), 'membros');
    },
    async inscrever(dados) {
      const uid = await identidade();
      const { tipo, refId } = dados;
      const agenda = ref(tipo === 'pedal' ? 'pedais' : 'eventos', refId);
      const inscricao = ref('inscricoes', tipo + '_' + refId + '_' + uid);
      const lote = writeBatch(db);
      lote.set(inscricao, { ...dados, uid, criadoEm: serverTimestamp() });
      lote.update(agenda, { confirmados: increment(1) });
      await gravar(lote.commit(), tipo === 'pedal' ? 'pedais' : 'eventos', 'inscricoes');
    },
    async enviarPedido(dados) {
      const uid = await identidade();
      const produto = await getDoc(ref('produtos', dados.produtoId));
      if (!produto.exists() || produto.data().ativo !== true || produto.data().preco !== dados.preco) {
        throw new Error('Produto alterado. Abra o pedido novamente.');
      }
      const { preco, ...pedido } = dados;
      await gravar(addDoc(colecao('pedidos'), { ...pedido, uid, criadoEm: serverTimestamp() }), 'pedidos');
    },
    criar: (nome, dados) => gravar(addDoc(colecao(nome), { ...camposAgenda(nome, dados), criadoEm: serverTimestamp() }), nome),
    editar: (nome, id, dados) => gravar(updateDoc(ref(nome, id), camposAgenda(nome, dados)), nome),
    async excluir(nome, id) {
      if (['pedais', 'eventos'].includes(nome)) return gravar(updateDoc(ref(nome, id), { ativo: false }), nome);
      if (nome !== 'inscricoes') return gravar(deleteDoc(ref(nome, id)), nome);
      await runTransaction(db, async transacao => {
        const inscricao = await transacao.get(ref(nome, id));
        if (!inscricao.exists()) return;
        const { tipo, refId } = inscricao.data();
        const agenda = ref(tipo === 'pedal' ? 'pedais' : 'eventos', refId);
        const item = await transacao.get(agenda);
        if (item.exists() && item.data().confirmados > 0) transacao.update(agenda, { confirmados: increment(-1) });
        transacao.delete(inscricao.ref);
      });
      atualizar('inscricoes', 'pedais', 'eventos');
    },
    async alternarMensalidade(id, mes) {
      await runTransaction(db, async transacao => {
        const membro = await transacao.get(ref('membros', id));
        if (!membro.exists() || membro.data().status !== 'ativo') throw new Error('Associado indisponível');
        transacao.update(membro.ref, new FieldPath('pagos', mes),
          membro.data().pagos?.[mes] ? deleteField() : serverTimestamp());
      });
      atualizar('membros');
    },
    salvarConfig({ zap, ...privado }) {
      const lote = writeBatch(db);
      lote.set(ref('config', 'publico'), { zap });
      lote.set(ref('config', 'geral'), privado);
      return gravar(lote.commit(), 'config');
    }
  };
}
