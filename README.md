# sistema de gestão de oficina mecanica

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

## Configuração inicial do administrador

Antes de iniciar o sistema pela primeira vez com um banco vazio, defina estas variáveis no arquivo local `.env.local`:

```env
BOOTSTRAP_ADMIN_NAME=Administrador
BOOTSTRAP_ADMIN_EMAIL=
BOOTSTRAP_ADMIN_PASSWORD=
```

Preencha o e-mail e uma senha única com pelo menos 12 caracteres. O servidor cria apenas essa conta de administrador; não são mais criadas contas de demonstração com senhas conhecidas. Se as credenciais não estiverem configuradas, a inicialização do banco vazio falha com uma mensagem explicativa. Mantenha `.env.local` fora do controle de versão.

Se o banco já foi inicializado por uma versão anterior, altere as senhas das contas existentes que usavam credenciais de demonstração antes de disponibilizar o sistema na rede.
