import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:3001/api', timeout: 10000 });

async function run() {
  try {
    console.log('Creating OS...');
    const createResp = await api.post('/ordens-servico', {
      cliente_id: 1,
      veiculo_id: 1,
      km: 500,
      produtos: [
        { codigo: 'P-TEST', descricao: 'Peça Teste', quantidade: 2, valor_unitario: 50, valor_total: 100 }
      ],
      servicos: [
        { codigo: 'S-TEST', descricao: 'Serviço Teste', quantidade: 1, valor_unitario: 200, valor_total: 200 }
      ],
      responsavel_tecnico: 'Tecnico Teste'
    });

    console.log('Create response:', createResp.status, createResp.data);
    const osId = createResp.data.id;
    if (!osId) throw new Error('OS id missing');

    console.log('Finalizing OS', osId);
    const fin = await api.put(`/ordens-servico/${osId}`, { status: 'Finalizada' });
    console.log('Finalize response:', fin.status, fin.data);

    console.log('Generating NF for OS', osId);
    const gen = await api.post(`/notas-fiscais/gerar/${osId}`);
    console.log('Generate response:', gen.status, gen.data);

    console.log('Listing NFs...');
    const list = await api.get('/notas-fiscais');
    console.log('NFs:', list.status, list.data);

    console.log('E2E test completed.');
  } catch (err) {
    console.error('E2E script error:');
    console.error('name:', err.name);
    console.error('message:', err.message);
    if (err.code) console.error('code:', err.code);
    if (err.stack) console.error('stack:', err.stack.split('\n').slice(0,5).join('\n'));
    if (err.response) {
      try {
        console.error('response.status:', err.response.status);
        console.error('response.data:', JSON.stringify(err.response.data, null, 2));
      } catch (e) {
        console.error('response (raw):', err.response);
      }
    }
    process.exit(1);
  }
}

run();
