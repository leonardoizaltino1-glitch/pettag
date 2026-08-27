# PetTag NFC — site completo

Esta pasta contém um site responsivo para demonstração e evolução para produção.

## O que já funciona
- Cadastro de pet e tutor
- Código público exclusivo por pet
- Painel "Meus pets"
- Status "perdido/encontrado"
- Perfil público
- Botões de ligação e WhatsApp
- Tela de gravação da NTAG213
- Web NFC quando o navegador/aparelho oferece suporte
- URL pública por tag

## Testar
Abra `index.html`.

Observação: nesta versão, os dados ficam no `localStorage` do navegador para facilitar o teste.

## Para colocar na internet de verdade
1. Hospedar em HTTPS.
2. Criar banco Supabase/PostgreSQL.
3. Criar autenticação de tutor.
4. Trocar o localStorage pelo banco.
5. Usar um domínio curto, por exemplo `petag.com.br/p/ABC123`.
6. Gravar essa URL na NTAG213.

O arquivo `supabase-schema.sql` contém uma estrutura inicial de banco.

## Sobre NFC
Para a NTAG213, grave somente a URL do perfil. Assim o telefone/endereço podem ser alterados sem regravar a coleira.

A leitura da URL gravada na tag pode abrir o perfil em Android/iPhone compatíveis.
A gravação diretamente pelo navegador não é universal; onde Web NFC não estiver disponível, a mesma URL pode ser gravada com um app NFC.
