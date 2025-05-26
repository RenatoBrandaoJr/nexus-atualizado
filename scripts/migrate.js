// Script para executar migrações no Supabase
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configurar caminhos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Definir diretamente as credenciais do Supabase
const supabaseUrl = "https://gvcdkwimnbawidoovcng.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2Y2Rrd2ltbmJhd2lkb292Y25nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NzY3MDg5MywiZXhwIjoyMDYzMjQ2ODkzfQ.BA0Kq-BWhl0FnHmXSlbHA9wQIzL33K0exaGYmjho4xo";

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Variáveis de ambiente SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas');
  process.exit(1);
}

console.log('Conectando ao Supabase...');
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Ler o arquivo SQL
const sqlPath = path.join(__dirname, '../src/config/database/schema.sql');
console.log(`Lendo arquivo SQL de: ${sqlPath}`);

let sqlContent;
try {
  sqlContent = fs.readFileSync(sqlPath, 'utf8');
  console.log('Arquivo SQL lido com sucesso!');
} catch (error) {
  console.error('Erro ao ler o arquivo SQL:', error);
  process.exit(1);
}

// Dividir o SQL em comandos individuais
// Divisão simplificada por ";" - para scripts mais complexos, um parser SQL seria recomendado
const commands = sqlContent
  .split(';')
  .map(cmd => cmd.trim())
  .filter(cmd => cmd.length > 0)
  .map(cmd => cmd + ';');

// Executar cada comando sequencialmente
async function runMigration() {
  console.log(`Encontrados ${commands.length} comandos SQL para executar.`);
  
  try {
    for (const [index, cmd] of commands.entries()) {
      console.log(`\nExecutando comando ${index + 1}/${commands.length}:`);
      console.log(cmd.substring(0, 150) + (cmd.length > 150 ? '...' : ''));
      
      const { data, error } = await supabase.rpc('exec_sql', { sql: cmd });
      
      if (error) {
        console.error(`Erro ao executar comando ${index + 1}:`, error);
        console.log('Comando que falhou:', cmd);
        
        // Verificar se é erro de função RPC não existente
        if (error.message.includes('function exec_sql() does not exist')) {
          console.error('\nERRO: A função "exec_sql" não existe no Supabase.');
          console.error('Esta abordagem requer uma função RPC personalizada. Tente o método alternativo usando o Editor SQL do Supabase.');
          process.exit(1);
        }
        
        // Perguntar se deseja continuar após erro
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          readline.question('Continuar com os próximos comandos? (s/n): ', resolve);
        });
        
        readline.close();
        
        if (answer.toLowerCase() !== 's') {
          console.log('Migração interrompida pelo usuário.');
          process.exit(1);
        }
      } else {
        console.log(`✓ Comando ${index + 1} executado com sucesso.`);
      }
    }
    
    console.log('\n✅ Migração concluída com sucesso!');
    console.log('Todas as tabelas e configurações foram criadas no Supabase.');
    
  } catch (error) {
    console.error('\n❌ Erro durante a migração:', error);
    console.error('Recomendação: Tente usar o Editor SQL do Supabase diretamente.');
  }
}

runMigration();
