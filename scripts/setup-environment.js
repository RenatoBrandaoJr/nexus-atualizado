/**
 * Script para configuração de novos ambientes de desenvolvimento
 * 
 * Este script automatiza a configuração de novos ambientes para o Nexus,
 * incluindo a inicialização do repositório Git, instalação de dependências
 * e configuração do TaskMaster.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { createLogger } from '../src/utils/logger.js';

// Inicializar logger
const logger = createLogger('Setup');

// Diretório raiz do projeto
const rootDir = path.resolve(process.cwd());

/**
 * Interface de linha de comando
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Pergunta ao usuário e retorna a resposta
 * @param {string} question - Pergunta
 * @returns {Promise<string>} - Resposta
 */
function pergunta(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Função principal
 */
async function main() {
  console.log('\n===== Configuração de Ambiente Nexus =====\n');
  
  try {
    // Verificar se é uma instalação nova ou existente
    const isGitInitialized = fs.existsSync(path.join(rootDir, '.git'));
    
    if (!isGitInitialized) {
      logger.info('Repositório Git não encontrado. Inicializando novo repositório...');
      
      const initGit = await pergunta('Deseja inicializar um novo repositório Git? (S/n): ');
      
      if (initGit.toLowerCase() !== 'n') {
        execSync('git init', { stdio: 'inherit' });
        logger.info('Repositório Git inicializado com sucesso!');
        
        // Commit inicial
        logger.info('Realizando commit inicial...');
        execSync('git add .', { stdio: 'inherit' });
        execSync('git commit -m "Commit inicial: Estrutura base do Nexus"', { stdio: 'inherit' });
        
        // Configurar remote
        const setupRemote = await pergunta('Deseja configurar um repositório remoto? (S/n): ');
        
        if (setupRemote.toLowerCase() !== 'n') {
          const remoteUrl = await pergunta('URL do repositório remoto: ');
          execSync(`git remote add origin ${remoteUrl}`, { stdio: 'inherit' });
          logger.info('Repositório remoto configurado com sucesso!');
          
          const pushRemote = await pergunta('Deseja realizar push para o repositório remoto? (S/n): ');
          
          if (pushRemote.toLowerCase() !== 'n') {
            execSync('git push -u origin main', { stdio: 'inherit' });
            logger.info('Push realizado com sucesso!');
          }
        }
      }
    }
    
    // Instalar dependências
    const installDeps = await pergunta('Deseja instalar/atualizar as dependências? (S/n): ');
    
    if (installDeps.toLowerCase() !== 'n') {
      logger.info('Instalando dependências...');
      execSync('npm install', { stdio: 'inherit' });
      logger.info('Dependências instaladas com sucesso!');
    }
    
    // Configurar TaskMaster
    const setupTaskMaster = await pergunta('Deseja configurar o TaskMaster? (S/n): ');
    
    if (setupTaskMaster.toLowerCase() !== 'n') {
      logger.info('Verificando instalação do TaskMaster...');
      
      try {
        execSync('npx task-master --version', { stdio: 'pipe' });
        logger.info('TaskMaster já está instalado.');
      } catch (error) {
        logger.info('TaskMaster não encontrado. Instalando...');
        execSync('npm install -g claude-task-master', { stdio: 'inherit' });
        logger.info('TaskMaster instalado com sucesso!');
      }
      
      // Inicializar TaskMaster no projeto
      logger.info('Inicializando TaskMaster no projeto...');
      execSync('npx task-master init --yes', { stdio: 'inherit' });
      logger.info('TaskMaster inicializado com sucesso!');
      
      // Verificar se existe um PRD para parse
      const hasPrd = await pergunta('Existe um documento de requisitos (PRD) para analisar? (s/N): ');
      
      if (hasPrd.toLowerCase() === 's') {
        const prdPath = await pergunta('Caminho para o arquivo PRD: ');
        
        if (fs.existsSync(prdPath)) {
          logger.info('Analisando PRD e gerando tarefas iniciais...');
          execSync(`npx task-master parse-prd --input="${prdPath}"`, { stdio: 'inherit' });
          logger.info('Tarefas geradas com sucesso!');
        } else {
          logger.error(`Arquivo não encontrado: ${prdPath}`);
        }
      }
    }
    
    // Configurar variáveis de ambiente
    const setupEnv = await pergunta('Deseja configurar as variáveis de ambiente? (S/n): ');
    
    if (setupEnv.toLowerCase() !== 'n') {
      // Verificar se .env existe
      if (!fs.existsSync(path.join(rootDir, '.env'))) {
        logger.info('Arquivo .env não encontrado. Criando a partir de .env.dev...');
        fs.copyFileSync(path.join(rootDir, '.env.dev'), path.join(rootDir, '.env'));
        logger.info('Arquivo .env criado com sucesso!');
      } else {
        const overwriteEnv = await pergunta('Arquivo .env já existe. Deseja substituí-lo? (s/N): ');
        
        if (overwriteEnv.toLowerCase() === 's') {
          fs.copyFileSync(path.join(rootDir, '.env.dev'), path.join(rootDir, '.env'));
          logger.info('Arquivo .env substituído com sucesso!');
        }
      }
    }
    
    console.log('\n===== Configuração concluída com sucesso! =====\n');
    console.log('Próximos passos:');
    console.log('1. Verifique o arquivo .env para ajustar as configurações conforme necessário');
    console.log('2. Execute "npm run dev" para iniciar o servidor de desenvolvimento');
    console.log('3. Acesse as tarefas com "npx task-master list"');
    console.log('\nBom desenvolvimento!\n');
    
  } catch (error) {
    logger.error(`Erro durante a configuração: ${error.message}`);
    console.error(error);
  } finally {
    rl.close();
  }
}

// Executar função principal
main();
