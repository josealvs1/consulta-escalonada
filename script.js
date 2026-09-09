const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbw6ncAKWC50QgTyujHKh9UkZMSdkK69_Zb7NbXK2eoZpH0-rxwBlBqd57AohA21kBrhwQ/exec";

// Pasta do próprio repositório GitHub Pages.
const PASTA_IMAGENS = "imagens_produtos";

// O site tenta estas extensões, nesta ordem.
const EXTENSOES_IMAGEM = ["png", "jpg", "jpeg", "webp"];

const SEGMENTOS = ["AD_ROTA", "ASR", "SUB_TRAD", "NAD"];

let produtos = [];
let carregando = false;
const el = {};

document.addEventListener("DOMContentLoaded", () => {
  mapearElementos();
  configurarEventos();
  carregarProdutos();
});

function mapearElementos() {
  el.pesquisa = document.getElementById("pesquisa");
  el.btnLimpar = document.getElementById("btnLimpar");
  el.btnAtualizar = document.getElementById("btnAtualizar");
  el.btnTentarNovamente = document.getElementById("btnTentarNovamente");
  el.statusProdutos = document.getElementById("statusProdutos");
  el.ultimaAtualizacao = document.getElementById("ultimaAtualizacao");
  el.estadoCarregando = document.getElementById("estadoCarregando");
  el.estadoErro = document.getElementById("estadoErro");
  el.estadoVazio = document.getElementById("estadoVazio");
  el.textoErro = document.getElementById("textoErro");
  el.listaProdutos = document.getElementById("listaProdutos");
}

function configurarEventos() {
  el.pesquisa.addEventListener("input", () => {
    atualizarBotaoLimpar();
    renderizarProdutos();
  });

  el.btnLimpar.addEventListener("click", () => {
    el.pesquisa.value = "";
    atualizarBotaoLimpar();
    renderizarProdutos();
    el.pesquisa.focus();
  });

  el.btnAtualizar.addEventListener("click", carregarProdutos);
  el.btnTentarNovamente.addEventListener("click", carregarProdutos);
}

async function carregarProdutos() {
  if (carregando) return;

  if (!urlConfigurada()) {
    mostrarErro("Informe a URL do Apps Script no arquivo script.js.");
    return;
  }

  carregando = true;
  el.btnAtualizar.disabled = true;
  mostrarCarregando();

  try {
    const resposta = await fetch(`${WEB_APP_URL}?acao=produtos&_=${Date.now()}`, {
      method: "GET",
      cache: "no-store"
    });

    if (!resposta.ok) throw new Error(`Falha HTTP ${resposta.status}`);

    const dados = await resposta.json();

    if (dados.status !== "success") {
      throw new Error(dados.message || "Não foi possível carregar os produtos.");
    }

    produtos = Array.isArray(dados.produtos) ? dados.produtos : [];

    produtos.sort((a, b) =>
      String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
        sensitivity: "base"
      })
    );

    el.ultimaAtualizacao.textContent =
      dados.atualizadoEm ? `Atualizado: ${dados.atualizadoEm}` : "";

    renderizarProdutos();

  } catch (erro) {
    mostrarErro(erro.message || "Erro desconhecido.");
    console.error(erro);
  } finally {
    carregando = false;
    el.btnAtualizar.disabled = false;
  }
}

function renderizarProdutos() {
  esconderEstados();
  el.listaProdutos.innerHTML = "";

  const termo = normalizar(el.pesquisa.value);

  const filtrados = termo
    ? produtos.filter((produto) => {
        const codigo = normalizar(produto.codigo);
        const nome = normalizar(produto.nome);
        return codigo.includes(termo) || nome.includes(termo);
      })
    : produtos;

  atualizarStatus(filtrados.length);

  if (filtrados.length === 0) {
    el.estadoVazio.classList.remove("oculto");
    return;
  }

  const fragmento = document.createDocumentFragment();

  filtrados.forEach((produto) => {
    fragmento.appendChild(criarCardProduto(produto));
  });

  el.listaProdutos.appendChild(fragmento);
}

function criarCardProduto(produto) {
  const card = document.createElement("article");
  card.className = "produto-card";

  const imagemArea = document.createElement("div");
  imagemArea.className = "imagem-area";
  montarImagemProduto(imagemArea, produto.codigo);

  const conteudo = document.createElement("div");
  conteudo.className = "produto-conteudo";

  const cabecalho = document.createElement("div");
  cabecalho.className = "produto-cabecalho";

  const codigo = document.createElement("span");
  codigo.className = "codigo";
  codigo.textContent = produto.codigo ? `Cód. ${produto.codigo}` : "Sem código";

  const nome = document.createElement("h2");
  nome.className = "produto-nome";
  nome.textContent = produto.nome || "Produto sem nome";

  cabecalho.appendChild(codigo);
  cabecalho.appendChild(nome);

  const metricas = document.createElement("div");
  metricas.className = "metricas";
  metricas.appendChild(criarMetrica("TTV", produto.ttv, "ttv"));
  metricas.appendChild(criarMetrica("TTC", produto.ttc, "ttc"));

  conteudo.appendChild(cabecalho);
  conteudo.appendChild(metricas);

  card.appendChild(imagemArea);
  card.appendChild(conteudo);

  return card;
}

function montarImagemProduto(container, codigoProduto) {
  const codigo = String(codigoProduto || "").trim();

  if (!codigo) {
    mostrarSemImagem(container);
    return;
  }

  const nomeBase = encodeURIComponent(codigo);
  let indiceExtensao = 0;

  const img = document.createElement("img");
  img.className = "imagem-produto";
  img.alt = `Imagem do produto ${codigo}`;
  img.loading = "lazy";

  function tentarProximaImagem() {
    if (indiceExtensao >= EXTENSOES_IMAGEM.length) {
      mostrarSemImagem(container);
      return;
    }

    const extensao = EXTENSOES_IMAGEM[indiceExtensao++];
    img.src = `${PASTA_IMAGENS}/${nomeBase}.${extensao}`;
  }

  img.addEventListener("error", tentarProximaImagem);

  container.appendChild(img);
  tentarProximaImagem();
}

function mostrarSemImagem(container) {
  container.innerHTML = `
    <div class="sem-imagem">
      <div>
        <div class="icone">📦</div>
        <span>Imagem não encontrada</span>
      </div>
    </div>
  `;
}

function criarMetrica(titulo, valores = {}, classe = "") {
  const box = document.createElement("div");
  box.className = `metrica ${classe}`.trim();

  const cabecalho = document.createElement("div");
  cabecalho.className = "metrica-titulo";
  cabecalho.textContent = titulo;
  box.appendChild(cabecalho);

  SEGMENTOS.forEach((segmento) => {
    const linha = document.createElement("div");
    linha.className = "preco-linha";

    const nome = document.createElement("span");
    nome.className = "segmento";
    nome.textContent = segmento;

    const preco = document.createElement("span");
    const valor = valores ? valores[segmento] : "";

    preco.className = "preco";
    preco.textContent = formatarPreco(valor);

    if (!temValor(valor)) preco.classList.add("vazio");

    linha.appendChild(nome);
    linha.appendChild(preco);
    box.appendChild(linha);
  });

  return box;
}

function formatarPreco(valor) {
  if (!temValor(valor)) return "—";

  const texto = String(valor).trim();
  if (/R\$/i.test(texto)) return texto;

  const numero = converterNumeroBR(texto);

  if (Number.isFinite(numero)) {
    return numero.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  return texto;
}

function converterNumeroBR(valor) {
  let texto = String(valor).replace(/\s/g, "").replace(/R\$/gi, "");

  if (texto.includes(",") && texto.includes(".")) {
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (texto.includes(",")) {
    texto = texto.replace(",", ".");
  }

  return Number(texto);
}

function temValor(valor) {
  return valor !== null &&
    valor !== undefined &&
    String(valor).trim() !== "";
}

function normalizar(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function atualizarBotaoLimpar() {
  el.btnLimpar.classList.toggle("oculto", el.pesquisa.value.trim() === "");
}

function atualizarStatus(quantidade) {
  const total = produtos.length;

  if (el.pesquisa.value.trim()) {
    el.statusProdutos.textContent =
      `${quantidade} de ${total} produto${total === 1 ? "" : "s"}`;
  } else {
    el.statusProdutos.textContent =
      `${total} produto${total === 1 ? "" : "s"}`;
  }
}

function mostrarCarregando() {
  esconderEstados();
  el.listaProdutos.innerHTML = "";
  el.estadoCarregando.classList.remove("oculto");
  el.statusProdutos.textContent = "Carregando produtos...";
}

function mostrarErro(texto) {
  esconderEstados();
  el.listaProdutos.innerHTML = "";
  el.textoErro.textContent = texto;
  el.estadoErro.classList.remove("oculto");
  el.statusProdutos.textContent = "Falha ao carregar";
}

function esconderEstados() {
  el.estadoCarregando.classList.add("oculto");
  el.estadoErro.classList.add("oculto");
  el.estadoVazio.classList.add("oculto");
}

function urlConfigurada() {
  return WEB_APP_URL &&
    WEB_APP_URL.startsWith("https://script.google.com/macros/s/") &&
    WEB_APP_URL.endsWith("/exec");
}
