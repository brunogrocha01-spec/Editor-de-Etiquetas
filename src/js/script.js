let clientesData = [];
let posicaoSelecionada = null;
let etiquetasGeradas = [];

const CONFIG = {
    labelWidthPx: 973,
    labelHeightPx: 340,
    tableWidthPx: 949,
    fontSizes: [16, 15, 14, 13, 12, 11, 10, 9],
    minCellPaddingPx: 8,
    pageWidthMm: 210,
    pageHeightMm: 297,
    labelWidthMm: 150,
    labelHeightMm: 49,
    labelsPerPage: 5,
    labelsPerRow: 1,
    horizontalGapMm: 0,
    verticalGapMm: 1,
    marginLeftMm: 30,
    marginTopMm: 26.8
};

const dropdownClientes = document.getElementById("dropdownClientes");
const textoArea = document.getElementById("canhotos");
const checkboxDeclaracao = document.getElementById("checkboxDeclaracao");
const alerta = document.getElementById("alerta");
const resumoEtiquetas = document.getElementById("resumo-etiquetas");
const printHost = document.getElementById("print-host");

fetch("src/data/clientes.json")
    .then(response => response.json())
    .then(data => {
        clientesData = data.clientes;
        clientesData.sort((a, b) => a.id.localeCompare(b.id));

        clientesData.forEach(cliente => {
            const option = document.createElement("option");
            option.value = cliente.id;
            option.textContent = cliente.id;
            dropdownClientes.appendChild(option);
        });
    });

dropdownClientes.addEventListener("change", atualizarTudo);
textoArea.addEventListener("input", atualizarTudo);
checkboxDeclaracao.addEventListener("change", atualizarTudo);

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("service-worker.js")
            .then(reg => console.log("Service Worker registrado:", reg.scope))
            .catch(err => console.log("Erro ao registrar Service Worker:", err));
    });
}

function atualizarTudo() {
    const cliente = obterClienteSelecionado();
    if (!cliente) {
        limparEtiqueta();
        return;
    }

    etiquetasGeradas = montarEtiquetas(cliente);
    exibirPreview(etiquetasGeradas[0]);
    atualizarResumo();
}

function obterClienteSelecionado() {
    return clientesData.find(c => c.id === dropdownClientes.value);
}

function obterNumerosCanhotos() {
    return textoArea.value
        .split(/[\s,;]+/)
        .map(n => n.trim())
        .filter(n => /^\d+$/.test(n))
        .sort((a, b) => Number(a) - Number(b));
}

function montarEtiquetas(cliente) {
    const incluirDeclaracao = checkboxDeclaracao.checked;
    const numeros = obterNumerosCanhotos();

    if (!incluirDeclaracao || numeros.length === 0) {
        return [{
            cliente,
            numeros: [],
            incluirDeclaracao,
            layout: criarLayoutTabela([]),
            pageIndex: 1,
            pageTotal: 1,
            totalNumeros: numeros.length
        }];
    }

    const etiquetas = [];
    let inicio = 0;

    while (inicio < numeros.length) {
        const ajuste = encontrarMaiorBloco(cliente, numeros, inicio);
        const fim = Math.max(inicio + 1, inicio + ajuste.quantidade);

        etiquetas.push({
            cliente,
            numeros: numeros.slice(inicio, fim),
            incluirDeclaracao,
            layout: ajuste.layout,
            pageIndex: etiquetas.length + 1,
            pageTotal: 0,
            totalNumeros: numeros.length
        });

        inicio = fim;
    }

    etiquetas.forEach(etiqueta => {
        etiqueta.pageTotal = etiquetas.length;
    });

    return etiquetas;
}

function encontrarMaiorBloco(cliente, numeros, inicio) {
    let baixo = 1;
    let alto = numeros.length - inicio;
    let melhor = {
        quantidade: 1,
        layout: criarLayoutTabela([numeros[inicio]])
    };

    while (baixo <= alto) {
        const meio = Math.floor((baixo + alto) / 2);
        const bloco = numeros.slice(inicio, inicio + meio);
        const layout = escolherLayoutQueCabe(cliente, bloco);

        if (layout) {
            melhor = { quantidade: meio, layout };
            baixo = meio + 1;
        } else {
            alto = meio - 1;
        }
    }

    return melhor;
}

function escolherLayoutQueCabe(cliente, numeros) {
    for (const fontSize of CONFIG.fontSizes) {
        const layout = criarLayoutTabela(numeros, fontSize);
        const label = criarElementoEtiqueta({
            cliente,
            numeros,
            incluirDeclaracao: true,
            layout,
            pageIndex: 1,
            pageTotal: 2,
            totalNumeros: numeros.length
        });

        printHost.appendChild(label);
        const cabe = label.scrollWidth <= CONFIG.labelWidthPx && label.scrollHeight <= CONFIG.labelHeightPx;
        printHost.removeChild(label);

        if (cabe) {
            return layout;
        }
    }

    return null;
}

function criarLayoutTabela(numeros, fontSize = CONFIG.fontSizes[0]) {
    if (numeros.length === 0) {
        return { fontSize, colunas: 1 };
    }

    const maiorNumero = numeros.reduce((maior, atual) => atual.length > maior.length ? atual : maior, numeros[0]);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.font = `${fontSize}px Arial`;

    const larguraCelula = Math.ceil(ctx.measureText(maiorNumero).width + CONFIG.minCellPaddingPx + 2);
    const colunas = Math.max(1, Math.floor(CONFIG.tableWidthPx / larguraCelula));

    return { fontSize, colunas };
}

function criarElementoEtiqueta(etiqueta) {
    const elemento = document.createElement("div");
    elemento.className = "print-label";
    elemento.innerHTML = criarHtmlEtiqueta(etiqueta);
    return elemento;
}

function criarHtmlEtiqueta(etiqueta) {
    const cliente = etiqueta.cliente;
    const declaracao = etiqueta.incluirDeclaracao
        ? "<br><br>Declaro receber os seguintes canhotos:"
        : "";

    const tabela = etiqueta.incluirDeclaracao
        ? criarHtmlTabela(etiqueta.numeros, etiqueta.layout)
        : "";

    const rodape = etiqueta.pageTotal > 1
        ? `<div class="label-footer">Etiqueta ${etiqueta.pageIndex} de ${etiqueta.pageTotal}</div>`
        : "";

    return `
        <div id="dados-etiqueta">
            <strong>${escapar(cliente.ac)} ${escapar(cliente.tipo)}</strong><br>
            ${escapar(cliente.nome)}<br>
            ${escapar(cliente.endereco)}<br>
            ${escapar(cliente.cidade)} CEP: ${escapar(cliente.cep)}
            ${declaracao}
        </div>
        <div id="tabela-canhotos">${tabela}</div>
        ${rodape}
    `;
}

function criarHtmlTabela(numeros, layout) {
    if (numeros.length === 0) {
        return "";
    }

    const larguraColuna = `${100 / layout.colunas}%`;
    let html = `<table class="tabela-canhotos" style="font-size:${layout.fontSize}px;">`;

    for (let i = 0; i < numeros.length; i += layout.colunas) {
        const linha = numeros.slice(i, i + layout.colunas);
        html += "<tr>";

        linha.forEach(numero => {
            html += `<td style="width:${larguraColuna};">${escapar(numero)}</td>`;
        });

        const faltantes = layout.colunas - linha.length;
        for (let j = 0; j < faltantes; j++) {
            html += `<td style="width:${larguraColuna};"></td>`;
        }

        html += "</tr>";
    }

    html += "</table>";
    return html;
}

function exibirPreview(etiqueta) {
    const content = document.getElementById("content");
    content.innerHTML = criarHtmlEtiqueta(etiqueta);
}

function limparEtiqueta() {
    etiquetasGeradas = [];
    document.getElementById("content").innerHTML = `
        <div id="dados-etiqueta"></div>
        <div id="tabela-canhotos"></div>
    `;
    alerta.innerText = "";
    resumoEtiquetas.innerText = "";
}

function atualizarResumo() {
    const totalNumeros = obterNumerosCanhotos().length;
    const totalEtiquetas = etiquetasGeradas.length || 0;

    alerta.innerText = "";

    if (!checkboxDeclaracao.checked) {
        resumoEtiquetas.innerText = "Declaração desmarcada: será gerada 1 etiqueta sem tabela de canhotos.";
        return;
    }

    if (totalNumeros === 0) {
        resumoEtiquetas.innerText = "Nenhum canhoto numérico informado.";
        return;
    }

    resumoEtiquetas.innerText = `${totalNumeros} canhoto(s) distribuído(s) em ${totalEtiquetas} etiqueta(s), sem corte de informações.`;
}

function verificaPreenchimento() {
    const cliente = obterClienteSelecionado();

    if (!cliente) {
        alert("Selecione um cliente antes de gerar o PDF.");
        return;
    }

    etiquetasGeradas = montarEtiquetas(cliente);
    exibirPreview(etiquetasGeradas[0]);
    atualizarResumo();
    abrirModal();
}

function abrirModal() {
    document.getElementById("modal").style.display = "flex";
    document.querySelectorAll(".areaEtiqueta").forEach(areaEtiqueta => {
        areaEtiqueta.onclick = () => {
            document.querySelectorAll(".areaEtiqueta").forEach(l => l.classList.remove("selected"));
            areaEtiqueta.classList.add("selected");
            posicaoSelecionada = areaEtiqueta.getAttribute("data-pos");
            fecharModal();
            gerarPDFComImagemNaPosicao(posicaoSelecionada);
        };
    });
}

function fecharModal() {
    document.getElementById("modal").style.display = "none";
    document.querySelectorAll(".areaEtiqueta").forEach(l => l.classList.remove("selected"));
}

async function gerarPDFComImagemNaPosicao(posicao) {
    const cliente = obterClienteSelecionado();
    if (!cliente) {
        alert("Selecione um cliente antes de gerar o PDF.");
        return;
    }

    etiquetasGeradas = montarEtiquetas(cliente);
    atualizarResumo();

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait"
    });

    const posicaoInicial = parseInt(posicao, 10);

    for (let i = 0; i < etiquetasGeradas.length; i++) {
        const posicaoNaFolha = ((posicaoInicial - 1 + i) % CONFIG.labelsPerPage) + 1;

        if (i > 0 && posicaoNaFolha === 1) {
            pdf.addPage();
        }

        const etiqueta = etiquetasGeradas[i];
        const elemento = criarElementoEtiqueta(etiqueta);
        printHost.appendChild(elemento);

        const canvas = await html2canvas(elemento, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff"
        });

        printHost.removeChild(elemento);

        const imgData = canvas.toDataURL("image/png");
        const idx = posicaoNaFolha - 1;
        const linha = Math.floor(idx / CONFIG.labelsPerRow);
        const coluna = idx % CONFIG.labelsPerRow;
        const posX = CONFIG.marginLeftMm + coluna * (CONFIG.labelWidthMm + CONFIG.horizontalGapMm);
        const posY = CONFIG.marginTopMm + linha * (CONFIG.labelHeightMm + CONFIG.verticalGapMm);

        pdf.addImage(imgData, "PNG", posX, posY, CONFIG.labelWidthMm, CONFIG.labelHeightMm);
    }

    pdf.save("etiqueta.pdf");
}

function escapar(valor) {
    return String(valor ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
