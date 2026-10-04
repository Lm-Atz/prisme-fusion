// Source du moteur pour le serveur : i18n (6 langues) + utilitaires + moteur, sans interface.
const fs=require('fs'),path=require('path');
const D=__dirname;
const rd=f=>fs.readFileSync(path.join(D,f),'utf8');
module.exports=()=>['v7_i18n_server.js','parts/r_util.js','v7_engine.js'].map(rd).join('\n');
