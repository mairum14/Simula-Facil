function login() {
  let email = document.getElementById("email").value;
  let senha = document.getElementById("senha").value;
  if (email && senha) {
    window.location.href = "home.html";
  } else {
    alert("Preencha todos os campos!");
  }
}

function prosseguir() {
  let consorcio = document.getElementById("consorcio").checked;
  let financiamento = document.getElementById("financiamento").checked;
  let aluguelInvestimento = document.getElementById("aluguel-investimento").checked;

  if (consorcio || financiamento || aluguelInvestimento) {
    let url = "nova-analise.html?consorcio=" + consorcio + "&financiamento=" + financiamento + "&aluguel-investimento=" + aluguelInvestimento;
    window.location.href = url;
  } else {
    alert("Selecione pelo menos uma opção!");
  }
}

function voltarHome() {
  window.location.href = "home.html";
}

function voltarEscolha() {
  let urlParams = new URLSearchParams(window.location.search);
  window.location.href = "escolha-opcoes.html?" + urlParams.toString();
}

if (window.location.pathname.includes("nova-analise.html")) {
  window.onload = function() {
    let urlParams = new URLSearchParams(window.location.search);
    let consorcio = urlParams.get("consorcio") === "true";
    let financiamento = urlParams.get("financiamento") === "true";
    let aluguelInvestimento = urlParams.get("aluguel-investimento") === "true";

    if (consorcio) document.getElementById("secao-consorcio").style.display = "block";
    if (financiamento) document.getElementById("secao-financiamento").style.display = "block";
    if (aluguelInvestimento) document.getElementById("secao-aluguel").style.display = "block";
  };
}

document.addEventListener("DOMContentLoaded", function() {
  let checkboxReduzida = document.getElementById("parcela-reduzida");
  if (checkboxReduzida) {
    checkboxReduzida.addEventListener("change", function() {
      document.getElementById("reducao").disabled = !this.checked;
    });
  }

  let cdbCheckbox = document.getElementById("cdb");
  let ipcaCheckbox = document.getElementById("ipca");
  let prefixadoCheckbox = document.getElementById("prefixado");

  if (cdbCheckbox) {
    cdbCheckbox.addEventListener("change", function() {
      document.getElementById("juros-cdb").disabled = !this.checked;
    });
  }
  if (ipcaCheckbox) {
    ipcaCheckbox.addEventListener("change", function() {
      document.getElementById("juros-ipca").disabled = !this.checked;
    });
  }
  if (prefixadoCheckbox) {
    prefixadoCheckbox.addEventListener("change", function() {
      document.getElementById("juros-prefixado").disabled = !this.checked;
    });
  }
});

// Função auxiliar para obter o último dia do último mês completo
function getUltimoMesCompleto() {
  const hoje = new Date("2025-03-14"); // Data fixa conforme instruções
  const ultimoMes = new Date(hoje);
  ultimoMes.setMonth(hoje.getMonth() - 1);
  ultimoMes.setDate(0); // Último dia do mês anterior
  return ultimoMes.toISOString().split("T")[0];
}

async function fetchTRData(prazo) {
  console.log("Buscando dados da TR para prazo:", prazo);
  try {
    const dataFim = getUltimoMesCompleto(); // Ex.: 2025-02-28
    const dataInicio = new Date(new Date(dataFim).setMonth(new Date(dataFim).getMonth() - Math.max(prazo, 12))).toISOString().split("T")[0];
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.226/dados?formato=json&dataInicial=${dataInicio}&dataFinal=${dataFim}`;
    console.log("URL da requisição TR:", url);
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Resposta não é um array");
    console.log("Dados TR retornados:", data);
    return data.map(item => parseFloat(item.valor) / 100);
  } catch (error) {
    console.error("Erro ao buscar TR:", error);
    return Array(prazo).fill(0.0002); // Fallback: 0,02% ao mês
  }
}

async function fetchCDIData() {
  console.log("Iniciando busca do CDI...");
  try {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados/ultimos/1?formato=json`;
    console.log("URL da requisição CDI:", url);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("Resposta inválida");
    const cdiDiario = parseFloat(data[0].valor) / 100; // Taxa diária em decimal (ex.: 0.00049037)
    console.log("CDI diário retornado pela API (%):", cdiDiario * 100);
    const cdiAnualizado = (Math.pow(1 + cdiDiario, 252) - 1) * 100; // Annualização para 252 dias úteis
    console.log("CDI anualizado calculado (% a.a.):", cdiAnualizado);
    return cdiAnualizado; // Retorna em % anual (ex.: 13.15)
  } catch (error) {
    console.error("Erro ao buscar CDI:", error);
    console.log("Usando fallback do CDI: 13.15");
    return 13.15; // Fallback
  }
}

async function fetchIPCAData(prazo) {
  console.log("Buscando dados do IPCA para prazo:", prazo);
  try {
    const dataFim = getUltimoMesCompleto(); // Ex.: 2025-02-28
    const dataInicio = new Date(new Date(dataFim).setMonth(new Date(dataFim).getMonth() - Math.max(prazo, 12))).toISOString().split("T")[0];
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=${dataInicio}&dataFinal=${dataFim}`;
    console.log("URL da requisição IPCA:", url);
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Resposta não é um array");
    console.log("Dados IPCA retornados:", data);
    return data.map(item => parseFloat(item.valor) / 100);
  } catch (error) {
    console.error("Erro ao buscar IPCA:", error);
    return Array(prazo).fill(0.005); // Fallback: 0,5% ao mês
  }
}

async function fetchINCCData(prazo) {
  console.log("Buscando dados do INCC para prazo:", prazo);
  try {
    const dataFim = getUltimoMesCompleto(); // Ex.: 2025-02-28
    const dataInicio = new Date(new Date(dataFim).setMonth(new Date(dataFim).getMonth() - Math.max(prazo, 12))).toISOString().split("T")[0];
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.192/dados?formato=json&dataInicial=${dataInicio}&dataFinal=${dataFim}`;
    console.log("URL da requisição INCC:", url);
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Resposta não é um array");
    console.log("Dados INCC retornados:", data);
    return data.map(item => parseFloat(item.valor) / 100);
  } catch (error) {
    console.error("Erro ao buscar INCC:", error);
    return Array(prazo).fill(0.004); // Fallback: 0,4% ao mês
  }
}

function calcularAcumulado(valores) {
  return valores.reduce((acc, val) => acc * (1 + val), 1) - 1;
}

async function simular() {
  console.log("Iniciando simulação...");
  localStorage.removeItem("simulacaoAtual");
  console.log("localStorage limpo antes da simulação.");

  let urlParams = new URLSearchParams(window.location.search);
  let consorcio = urlParams.get("consorcio") === "true";
  let financiamento = urlParams.get("financiamento") === "true";
  let aluguelInvestimento = urlParams.get("aluguel-investimento") === "true";

  let resultado = {};
  let detalhes = {};
  let cdiAtual = await fetchCDIData(); // Valor em % anual (ex.: 13.15)
  console.log("CDI atual obtido (anualizado):", cdiAtual);

  let trData = financiamento ? await fetchTRData(parseInt(document.getElementById("prazo-fin")?.value || 0)) : await fetchTRData(12);
  let ipcaData = consorcio || aluguelInvestimento ? await fetchIPCAData(parseInt(document.getElementById("prazo-total")?.value || document.getElementById("prazo-aluguel")?.value || 0)) : await fetchIPCAData(12);
  let inccData = consorcio ? await fetchINCCData(parseInt(document.getElementById("prazo-total")?.value || 0)) : await fetchINCCData(12);

  let tr12Meses = trData.slice(-12);
  let ipca12Meses = ipcaData.slice(-12);
  let incc12Meses = inccData.slice(-12);

  if (consorcio) {
    let valorCarta = parseFloat(document.getElementById("valor-carta").value) || 0;
    let prazoTotal = parseInt(document.getElementById("prazo-total").value) || 0;
    let prazoRestante = parseInt(document.getElementById("prazo-restante").value) || 0;
    let valorParcela = parseFloat(document.getElementById("valor-parcela").value) || 0;
    let parcelaReduzida = document.getElementById("parcela-reduzida").checked;
    let reducao = parcelaReduzida ? parseFloat(document.getElementById("reducao").value) / 100 : 0;
    let taxaAdmin = parseFloat(document.getElementById("taxa-admin").value) / 100 || 0;
    let fundoReserva = parseFloat(document.getElementById("fundo-reserva").value) / 100 || 0;
    let taxaAdesao = parseFloat(document.getElementById("taxa-adesao").value) || 0;
    let seguroVida = parseFloat(document.getElementById("seguro-vida").value) || 0;
    let correcao = document.getElementById("correcao").value;

    if (!valorCarta || !prazoTotal) {
      alert("Campos obrigatórios no Consórcio: Valor da Carta e Prazo Total devem ser preenchidos!");
      return;
    }

    let custoTotal = (valorParcela * prazoTotal * (1 - reducao)) + (valorCarta * taxaAdmin) + (valorCarta * fundoReserva) + taxaAdesao + (seguroVida * prazoTotal);
    let parcelaAjustada = parcelaReduzida ? valorParcela * (1 - reducao) : valorParcela;
    let valorCorrigido = valorCarta;
    if (correcao === "IPCA") {
      valorCorrigido *= ipcaData.slice(0, prazoTotal).reduce((acc, val) => acc * (1 + val), 1);
    } else if (correcao === "INCC") {
      valorCorrigido *= inccData.slice(0, prazoTotal).reduce((acc, val) => acc * (1 + val), 1);
    }

    let parcelasConsorcio = [];
    let acumulado = 0;
    for (let i = 0; i < prazoTotal; i++) {
      acumulado += parcelaAjustada + seguroVida;
      parcelasConsorcio.push({ mes: i + 1, parcela: parcelaAjustada, acumulado: acumulado });
    }

    resultado.consorcio = { custoTotalConsorcio: custoTotal.toFixed(2), parcelaAjustadaConsorcio: parcelaAjustada.toFixed(2), valorCorrigidoConsorcio: valorCorrigido.toFixed(2) };
    detalhes.consorcio = { 
      parcelas: parcelasConsorcio, 
      valorCarta, 
      prazoTotal, 
      prazoRestante, 
      valorParcela, 
      parcelaReduzida, 
      reducao: parcelaReduzida ? reducao * 100 : 0, 
      taxaAdmin: taxaAdmin * 100, 
      fundoReserva: fundoReserva * 100, 
      taxaAdesao, 
      seguroVida, 
      correcao 
    };
  }

  if (financiamento) {
    let valorFin = parseFloat(document.getElementById("valor-fin").value) || 0;
    let jurosFin = parseFloat(document.getElementById("juros-fin").value) / 100 / 12 || 0;
    let prazoFin = parseInt(document.getElementById("prazo-fin").value) || 0;
    let entradaFin = parseFloat(document.getElementById("entrada-fin").value) || 0;
    let taxasExtrasFin = parseFloat(document.getElementById("taxas-extras-fin").value) || 0;

    if (!valorFin || !prazoFin) {
      alert("Campos obrigatórios no Financiamento: Valor do Financiamento e Prazo devem ser preenchidos!");
      return;
    }

    if (trData.length < prazoFin) {
      const ultimoTR = trData[trData.length - 1] || 0.0002;
      while (trData.length < prazoFin) trData.push(ultimoTR);
    }

    let saldoDevedor = valorFin - entradaFin;
    let custoTotal = entradaFin + taxasExtrasFin;
    let totalJuros = 0;
    let parcelas = [];

    for (let i = 0; i < prazoFin; i++) {
      let jurosMes = saldoDevedor * (jurosFin + trData[i]);
      let amortizacao = (valorFin - entradaFin) / prazoFin;
      let parcela = jurosMes + amortizacao;
      saldoDevedor = saldoDevedor * (1 + trData[i]) - amortizacao;
      if (saldoDevedor < 0) saldoDevedor = 0;
      custoTotal += parcela;
      totalJuros += jurosMes;
      parcelas.push({ mes: i + 1, parcela: parcela, Juros: jurosMes, amortizacao: amortizacao, saldo: saldoDevedor });
    }

    let parcelaMedia = parcelas.reduce((a, b) => a + b.parcela, 0) / parcelas.length;

    resultado.financiamento = { custoTotalFinanciamento: custoTotal.toFixed(2), parcelaFinanciamento: parcelaMedia.toFixed(2), jurosFinanciamento: totalJuros.toFixed(2) };
    detalhes.financiamento = { 
      parcelas, 
      valorFin, 
      jurosFin: jurosFin * 12 * 100, // Convertido de volta para % anual
      prazoFin, 
      entradaFin, 
      taxasExtrasFin 
    };
  }

  if (aluguelInvestimento) {
    let aluguel = parseFloat(document.getElementById("aluguel").value) || 0;
    let entradaAluguel = parseFloat(document.getElementById("entrada-aluguel").value) || 0;
    let prazoAluguel = parseInt(document.getElementById("prazo-aluguel").value) || 0;
    let aportes = parseFloat(document.getElementById("aportes-aluguel").value) || 0;
    let percentCdi = document.getElementById("cdb").checked ? parseFloat(document.getElementById("juros-cdb").value) / 100 : 0;
    let jurosCdb = percentCdi * (cdiAtual / 100) / 12; // CDI anual (% a.a.) para decimal mensal
    console.log("Calculando jurosCdb: percentCdi =", percentCdi, "cdiAtual =", cdiAtual, "jurosCdb mensal =", jurosCdb);
    let jurosIpca = document.getElementById("ipca").checked ? (parseFloat(document.getElementById("juros-ipca").value) || 0) / 100 / 12 : 0;
    let jurosPrefixado = document.getElementById("prefixado").checked ? parseFloat(document.getElementById("juros-prefixado").value) / 100 / 12 : 0;

    if (!aluguel || !entradaAluguel || !prazoAluguel) {
      alert("Campos obrigatórios no Aluguel + Investimento: Valor do Aluguel, Valor de Entrada e Prazo devem ser preenchidos!");
      return;
    }

    let totalAluguel = aluguel * prazoAluguel;
    let montante = entradaAluguel;
    let parcelasAluguel = [];
    for (let i = 0; i < prazoAluguel; i++) {
      montante = montante * (1 + (jurosCdb + (i < ipcaData.length ? ipcaData[i] : jurosIpca) + jurosPrefixado)) + aportes;
      parcelasAluguel.push({ mes: i + 1, aluguel: aluguel, aporte: aportes, montante: montante });
    }
    let lucroLiquido = montante - entradaAluguel - (aportes * prazoAluguel);

    resultado.aluguelInvestimento = { totalAluguel: totalAluguel.toFixed(2), montanteInvestido: montante.toFixed(2), lucroLiquido: lucroLiquido.toFixed(2) };
    detalhes.aluguelInvestimento = { 
      parcelas: parcelasAluguel, 
      aluguel, 
      entradaAluguel, 
      prazoAluguel, 
      aportes, 
      percentCdi: percentCdi * 100, 
      jurosIpca: jurosIpca * 12 * 100, 
      jurosPrefixado: jurosPrefixado * 12 * 100 
    };
  }

  resultado.cdiAtual = cdiAtual.toFixed(2); // CDI anual em % (ex.: "13.15")
  console.log("CDI armazenado em resultado.cdiAtual antes de salvar:", resultado.cdiAtual);
  resultado.trAtual = (trData[trData.length - 1] * 100).toFixed(4);
  resultado.ipcaAtual = (ipcaData[ipcaData.length - 1] * 100).toFixed(2);
  resultado.inccAtual = (inccData[inccData.length - 1] * 100).toFixed(2);
  resultado.trAcumulado = (calcularAcumulado(tr12Meses) * 100).toFixed(4);
  resultado.ipcaAcumulado = (calcularAcumulado(ipca12Meses) * 100).toFixed(2);
  resultado.inccAcumulado = (calcularAcumulado(incc12Meses) * 100).toFixed(2);
  resultado.consorcioAtivo = consorcio;
  resultado.financiamentoAtivo = financiamento;
  resultado.aluguelInvestimentoAtivo = aluguelInvestimento;

  console.log("Simulação concluída, salvando no localStorage...");
  localStorage.setItem("simulacaoAtual", JSON.stringify({ resultado, detalhes }));
  console.log("Dados salvos no localStorage:", JSON.parse(localStorage.getItem("simulacaoAtual")));
  window.location.href = "resultado.html?simulacao=atual";
}

if (window.location.pathname.includes("resultado.html")) {
  window.onload = function() {
    console.log("Carregando página de resultados...");
    let urlParams = new URLSearchParams(window.location.search);
    let simulacaoAtual = JSON.parse(localStorage.getItem("simulacaoAtual") || "{}");
    if (!urlParams.get("simulacao") || !simulacaoAtual.resultado) {
      console.log("Nenhuma simulação disponível no localStorage.");
      alert("Nenhuma simulação disponível!");
      window.location.href = "home.html";
      return;
    }

    console.log("Simulação carregada do localStorage:", simulacaoAtual);
    let resultado = simulacaoAtual.resultado;
    let detalhes = simulacaoAtual.detalhes;
    let consorcio = resultado.consorcioAtivo;
    let financiamento = resultado.financiamentoAtivo;
    let aluguelInvestimento = resultado.aluguelInvestimentoAtivo;

    document.getElementById("cdi-atual").textContent = resultado.cdiAtual ? `${resultado.cdiAtual}%` : "Indisponível";
    console.log("CDI exibido em resultado.html:", resultado.cdiAtual);
    document.getElementById("tr-atual").textContent = resultado.trAtual ? `${resultado.trAtual}%` : "Indisponível";
    document.getElementById("ipca-atual").textContent = resultado.ipcaAtual ? `${resultado.ipcaAtual}%` : "Indisponível";
    document.getElementById("incc-atual").textContent = resultado.inccAtual ? `${resultado.inccAtual}%` : "Indisponível";
    document.getElementById("tr-acumulado").textContent = resultado.trAcumulado ? `${resultado.trAcumulado}%` : "Indisponível";
    document.getElementById("ipca-acumulado").textContent = resultado.ipcaAcumulado ? `${resultado.ipcaAcumulado}%` : "Indisponível";
    document.getElementById("incc-acumulado").textContent = resultado.inccAcumulado ? `${resultado.inccAcumulado}%` : "Indisponível";

    if (consorcio && resultado.consorcio) {
      document.getElementById("resultado-consorcio").style.display = "block";
      document.getElementById("custo-total-consorcio").textContent = "R$ " + parseFloat(resultado.consorcio.custoTotalConsorcio).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      document.getElementById("parcela-ajustada-consorcio").textContent = "R$ " + parseFloat(resultado.consorcio.parcelaAjustadaConsorcio).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      document.getElementById("valor-corrigido-consorcio").textContent = "R$ " + parseFloat(resultado.consorcio.valorCorrigidoConsorcio).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    }

    if (financiamento && resultado.financiamento) {
      document.getElementById("resultado-financiamento").style.display = "block";
      document.getElementById("custo-total-financiamento").textContent = "R$ " + parseFloat(resultado.financiamento.custoTotalFinanciamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      document.getElementById("parcela-financiamento").textContent = "R$ " + parseFloat(resultado.financiamento.parcelaFinanciamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      document.getElementById("juros-financiamento").textContent = "R$ " + parseFloat(resultado.financiamento.jurosFinanciamento).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    }

    if (aluguelInvestimento && resultado.aluguelInvestimento) {
      document.getElementById("resultado-aluguel").style.display = "block";
      document.getElementById("total-aluguel").textContent = "R$ " + parseFloat(resultado.aluguelInvestimento.totalAluguel).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      document.getElementById("montante-investido").textContent = "R$ " + parseFloat(resultado.aluguelInvestimento.montanteInvestido).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      document.getElementById("lucro-liquido").textContent = "R$ " + parseFloat(resultado.aluguelInvestimento.lucroLiquido).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    }
  };
}

function voltar() {
  window.location.href = "nova-analise.html?" + new URLSearchParams(window.location.search).toString();
}

function salvarSimulacao() {
  let nome = prompt("Digite um nome para esta simulação:");
  if (!nome) return;

  let simulacaoAtual = JSON.parse(localStorage.getItem("simulacaoAtual") || "{}");
  let simulacao = {
    nome: nome,
    data: new Date().toLocaleString("pt-BR"),
    resultado: simulacaoAtual.resultado,
    detalhes: simulacaoAtual.detalhes
  };

  let analisesSalvas = JSON.parse(localStorage.getItem("analisesSalvas") || "[]");
  analisesSalvas.push(simulacao);
  localStorage.setItem("analisesSalvas", JSON.stringify(analisesSalvas));
  alert("Simulação salva com sucesso!");
}

function verDetalhado() {
  window.location.href = "detalhado.html?simulacao=atual";
}