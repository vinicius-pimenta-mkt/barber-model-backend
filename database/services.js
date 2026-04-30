import { get } from './database.js';

/**
 * Busca o preço do serviço diretamente no banco de dados SQLite.
 * Importante: Como agora isso lê o banco, a função virou Assíncrona (async/await).
 * O preço retornado será em centavos. Ex: R$ 30,00 -> retorna 3000
 */
export const getServicePrice = async (serviceName) => {
  try {
    // Busca na nova tabela de servicos do banco de dados
    const row = await get('SELECT preco FROM servicos WHERE nome = ?', [serviceName]);
    
    // Retorna o preço que está no banco (espera-se que esteja em centavos)
    return row ? row.preco : 0;
  } catch (error) {
    console.error('Erro ao buscar preco do servico no banco:', error);
    return 0;
  }
};
