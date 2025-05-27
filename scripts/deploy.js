/**
 * Script de deploy para o Nexus
 * 
 * Este script automatiza o processo de deploy do Nexus
 * para ambientes de desenvolvimento, teste e produção.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createLogger } from '../src/utils/logger.js';

// Carregar variáveis de ambiente
dotenv.config();

// Inicializar logger
const logger = createLogger('Deploy');

// Diretório raiz do projeto
const rootDir = path.resolve(process.cwd());

// Ambientes suportados
const environments = ['dev', 'test', 'prod'];

/**
 * Realiza o deploy para o ambiente especificado
 * @param {string} env - Ambiente de deploy (dev, test, prod)
 */
function deploy(env) {
  if (!environments.includes(env)) {
    logger.error(`Ambiente inválido: ${env}. Use um dos seguintes: ${environments.join(', ')}`);
    process.exit(1);
  }

  logger.info(`Iniciando deploy para ambiente: ${env}`);

  try {
    // Verificar se não há alterações não commitadas
    logger.info('Verificando status do Git...');
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf-8' });
    
    if (gitStatus.trim() !== '') {
      logger.warn('Existem alterações não commitadas:');
      console.log(gitStatus);
      
      // Perguntar se deseja continuar
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      readline.question('Deseja continuar mesmo com alterações não commitadas? (s/N) ', answer => {
        readline.close();
        
        if (answer.toLowerCase() !== 's') {
          logger.info('Deploy cancelado pelo usuário');
          process.exit(0);
        }
        
        // Continuar com o deploy
        executeDeploy(env);
      });
    } else {
      // Nenhuma alteração não commitada, continuar com o deploy
      executeDeploy(env);
    }
  } catch (error) {
    logger.error(`Erro ao verificar status do Git: ${error.message}`);
    logger.info('Continuando com o deploy sem verificação do Git...');
    executeDeploy(env);
  }
}

/**
 * Executa as etapas do processo de deploy
 * @param {string} env - Ambiente de deploy
 */
function executeDeploy(env) {
  try {
    // 1. Executar testes
    logger.info('Executando testes...');
    execSync('npm test', { stdio: 'inherit' });
    
    // 2. Construir a aplicação
    logger.info('Construindo a aplicação...');
    execSync('npm run build', { stdio: 'inherit' });
    
    // 3. Preparar diretório de deploy
    const deployDir = path.join(rootDir, 'dist');
    logger.info(`Preparando diretório de deploy: ${deployDir}`);
    
    if (!fs.existsSync(deployDir)) {
      fs.mkdirSync(deployDir, { recursive: true });
    }
    
    // 4. Copiar arquivos necessários
    logger.info('Copiando arquivos para diretório de deploy...');
    execSync(`cp -r package.json package-lock.json .env.${env} ${deployDir}/`, { stdio: 'inherit' });
    
    // 5. Renomear arquivo de ambiente
    logger.info('Configurando variáveis de ambiente...');
    execSync(`mv ${deployDir}/.env.${env} ${deployDir}/.env`, { stdio: 'inherit' });
    
    // 6. Deploy para o servidor apropriado
    if (env === 'prod' || env === 'test') {
      deployToRemoteServer(env, deployDir);
    } else {
      logger.info('Deploy local concluído com sucesso!');
    }
    
    logger.info(`Deploy para ambiente ${env} concluído com sucesso!`);
  } catch (error) {
    logger.error(`Erro durante o deploy: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Realiza o deploy para um servidor remoto
 * @param {string} env - Ambiente de deploy
 * @param {string} deployDir - Diretório de deploy
 */
function deployToRemoteServer(env, deployDir) {
  const envPrefix = env.toUpperCase();
  const host = process.env[`${envPrefix}_DEPLOY_HOST`];
  const user = process.env[`${envPrefix}_DEPLOY_USER`];
  const path = process.env[`${envPrefix}_DEPLOY_PATH`];
  
  if (!host || !user || !path) {
    logger.error(`Configurações de deploy para ambiente ${env} não encontradas no arquivo .env`);
    process.exit(1);
  }
  
  logger.info(`Realizando deploy para servidor remoto: ${user}@${host}:${path}`);
  
  try {
    // Sincronizar arquivos com o servidor remoto
    execSync(`rsync -avz --delete ${deployDir}/ ${user}@${host}:${path}`, { stdio: 'inherit' });
    
    // Reiniciar o serviço no servidor remoto
    execSync(`ssh ${user}@${host} "cd ${path} && pm2 restart nexus || pm2 start npm --name nexus -- start"`, { stdio: 'inherit' });
    
    logger.info('Deploy para servidor remoto concluído com sucesso!');
  } catch (error) {
    logger.error(`Erro durante deploy para servidor remoto: ${error.message}`);
    process.exit(1);
  }
}

// Verificar argumentos da linha de comando
const args = process.argv.slice(2);
const env = args[0] || 'dev';

// Executar deploy
deploy(env);
