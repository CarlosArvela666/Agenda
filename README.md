# Agenda Plano

Site estático em HTML, CSS e JavaScript, sem servidor ou dependências de build.

## Publicar no Render

O ficheiro `render.yaml` configura o serviço como static site. O comando de build copia os três ficheiros da aplicação para `dist/`, que é a pasta publicada.

Se configurares o serviço pelo Dashboard em vez de usar o Blueprint, usa:

- **Root Directory:** raiz do repositório
- **Build Command:** `mkdir -p dist && cp index.html styles.css app.js dist/`
- **Publish Directory:** `dist`

Depois de ligar o repositório, faz deploy do ramo que contém estes ficheiros.
