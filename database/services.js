export const SERVICES_PRICES = {
  "Barba": 3000,
  "Barba + Pézinho": 4000,
  "Barba + Pigmentação": 5000,
  "Barba Express": 2000,
  "Bigode": 1000,
  "Camuflagem (Fios brancos)": 3500,
  "Cone Hindu": 2500,
  "Corte": 4000,
  "Corte + Pigmentação": 6000,
  "Corte 1 pente + barba": 5000,
  "Corte e Barba": 6000,
  "Corte Infantil": 4500,
  "Corte Máquina 1 pente": 2500,
  "Hidratação Capilar": 2500,
  "Limpeza Nasal": 2500,
  "Luzes": 10000,
  "Luzes e Corte": 14000,
  "Navalhado": 3000,
  "Navalhado + Barba": 5000,
  "Pezinho": 1000,
  "Pigmentação": 2500,
  "Platinado": 10000,
  "Platinado e Corte": 14000,
  "Sobrancelha": 1000,
  "Sobrancelha na fita": 2500
};

export const getServicePrice = (serviceName) => {
  // Retorna o preço em centavos
  return SERVICES_PRICES[serviceName] || 0;
};