let clientesData = [];

fetch('src/data/clientes.json')
    .then(response => response.json())
    .then(data => {
        clientesData = data.clientes;

        const dropdown = document.getElementById('dropdownClientes');

        // Ordena os clientes pelo campo 'id' em ordem alfabética
        clientesData.sort((a, b) => {
            if (a.id < b.id) return -1; // a vem antes de b
            if (a.id > b.id) return 1; // b vem antes de a
            return 0; // são iguais
        });

        clientesData.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.id;
            dropdown.appendChild(option);
        });
    });


document.getElementById('dropdownClientes').addEventListener('change', function() {
    const nomeSelecionado = this.value;
    const cliente = clientesData.find(c => c.id === nomeSelecionado);
    if (cliente) {
        atualizarEtiqueta(cliente);
    }
});


function gerarEtiqueta() {

    const canhotosRaw = document.getElementById('canhotos').value;

    const numeros = canhotosRaw
        .split(/[\s,]+/)
        .filter(n => /^\d+$/.test(n))
        .sort((a, b) => Number(a) - Number(b));


    let tamanhoFonte = 16;

    if (numeros.length > 300) tamanhoFonte = 10;
    if (numeros.length > 600) tamanhoFonte = 8;
    if (numeros.length > 900) tamanhoFonte = 6;


    const maiorNumero = numeros.reduce((a,b)=>
        a.length > b.length ? a : b
    );


    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    ctx.font = `${tamanhoFonte}px Arial`;

    const larguraNumero = ctx.measureText(maiorNumero).width;


    const larguraCelula = larguraNumero + 4;


    const colunasPorLinha = Math.floor(973 / larguraCelula);


    let tabelaHTML =
    '<table id="minhaTabela" style="border-collapse:collapse;">';


    numeros.forEach((n,index)=>{

        if(index % colunasPorLinha === 0){
            tabelaHTML += "<tr>";
        }


        tabelaHTML +=
        `<td style="
        border:1px solid black;
        padding:1px;
        font-size:${tamanhoFonte}px;">
        ${n}
        </td>`;


        if(
        index % colunasPorLinha === colunasPorLinha-1
        ){
            tabelaHTML += "</tr>";
        }

    });


    tabelaHTML += "</table>";


    document.getElementById('tabela-canhotos')
    .innerHTML = tabelaHTML;


    document.getElementById("alerta").innerText = "";

}

let posicaoSelecionada = null;

function verificaPreenchimento() {
    if (false) {
        alert("Preencha todos os campos corretamente.")
    } else {
        abrirModal()
    }
}

function abrirModal() {
    document.getElementById('modal').style.display = 'flex';
    document.querySelectorAll('.areaEtiqueta').forEach(areaEtiqueta => {
        areaEtiqueta.onclick = () => {
            document.querySelectorAll('.areaEtiqueta').forEach(l => l.classList.remove('selected'));
            areaEtiqueta.classList.add('selected');
            posicaoSelecionada = areaEtiqueta.getAttribute('data-pos');
            fecharModal();
            gerarPDFComImagemNaPosicao(posicaoSelecionada);
        };
    });
}

function fecharModal() {
    document.getElementById('modal').style.display = 'none';
    document.querySelectorAll('.areaEtiqueta').forEach(l => l.classList.remove('selected'));
}

async function gerarPDFComImagemNaPosicao(posicao) {


const content = document.getElementById("content");


const canvas = await html2canvas(content,{
    scale:2,
    useCORS:true
});


const imgData = canvas.toDataURL("image/png");


const {
 jsPDF
}=window.jspdf;



const pdf = new jsPDF({
 unit:"mm",
 format:"a4",
 orientation:"portrait"
});



const larguraEtiqueta = 150;
const alturaEtiqueta = 49;


const paginaLargura = 210;



const margemEsquerda = 30;
const margemSuperior = 26.8;



const totalAltura = canvas.height;



const alturaPorEtiqueta =
canvas.height *
(alturaEtiqueta / canvas.height);



let paginas =
Math.ceil(
totalAltura /
(canvas.height * 0.55)
);



if(paginas < 1){
paginas = 1;
}




for(let i=0;i<paginas;i++){


if(i>0){
pdf.addPage();
}



const corte = document.createElement("canvas");

corte.width = canvas.width;
corte.height =
Math.min(
canvas.height,
canvas.height*0.55
);



const ctx =
corte.getContext("2d");



ctx.drawImage(
canvas,
0,
-i*corte.height
);



const imagem =
corte.toDataURL("image/png");



pdf.addImage(
imagem,
"PNG",
margemEsquerda,
margemSuperior,
larguraEtiqueta,
alturaEtiqueta
);



}



pdf.save("etiqueta.pdf");

}

const textoArea = document.getElementById('canhotos');
textoArea.addEventListener('input', gerarEtiqueta);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js")
      .then(reg => console.log("Service Worker registrado:", reg.scope))
      .catch(err => console.log("Erro ao registrar Service Worker:", err));
  });
}

function atualizarEtiqueta(cliente) {
    const incluirDeclaracao = document.getElementById('checkboxDeclaracao').checked;

    const texto = `
        <strong>${cliente.ac} ${cliente.tipo}</strong><br>
        ${cliente.nome}<br>
        ${cliente.endereco}<br>
        ${cliente.cidade} CEP: ${cliente.cep}
        ${incluirDeclaracao ? "<br><br>Declaro receber os seguintes canhotos:" : ""}
    `;

    document.getElementById('dados-etiqueta').innerHTML = texto;

    // Mostra ou esconde a tabela de canhotos conforme o checkbox
    document.getElementById('tabela-canhotos').style.display = incluirDeclaracao ? 'block' : 'none';

    // Altera o tamanho da fonte com base na checkbox
    const content = document.getElementById('content');
    content.style.fontSize = incluirDeclaracao ? '16px' : '20px'; // ou maior se quiser
}

document.getElementById('checkboxDeclaracao').addEventListener('change', () => {
    const nomeSelecionado = document.getElementById('dropdownClientes').value;
    const cliente = clientesData.find(c => c.id === nomeSelecionado);
    if (cliente) {
        atualizarEtiqueta(cliente);
    }
});
