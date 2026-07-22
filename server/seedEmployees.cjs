const Database = require("better-sqlite3");
const path = require("path");
const db = new Database(path.join(__dirname, "sernic.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

console.log("[SEED] A ler estrutura organizacional...");
const careers    = db.prepare("SELECT * FROM careers    WHERE is_active=1 ORDER BY sort_order").all();
const categories = db.prepare("SELECT * FROM categories WHERE is_active=1 ORDER BY career_id, sort_order").all();
const dirs       = db.prepare("SELECT * FROM directorates WHERE is_active=1 ORDER BY sort_order").all();
const depts      = db.prepare("SELECT * FROM departments WHERE is_active=1").all();
const districts  = db.prepare("SELECT * FROM district_directorates WHERE is_active=1 ORDER BY province, name").all();
const sections   = db.prepare("SELECT * FROM sections WHERE is_active=1 AND district_directorate_id IS NOT NULL").all();

const catsByCareer = {};
categories.forEach(c => { if (!catsByCareer[c.career_id]) catsByCareer[c.career_id] = []; catsByCareer[c.career_id].push(c); });
const secsByDistrict = {};
sections.forEach(s => { if (!secsByDistrict[s.district_directorate_id]) secsByDistrict[s.district_directorate_id] = []; secsByDistrict[s.district_directorate_id].push(s); });

console.log("[SEED] Carreiras: "+careers.length+" | Categorias: "+categories.length+" | Distritos: "+districts.length+" | Seccoes: "+sections.length);

const existing = db.prepare("SELECT COUNT(*) as c FROM employees").get().c;
if (existing >= 30) { console.log("[SEED] Ja existem "+existing+" funcionarios. Abortando."); db.close(); process.exit(0); }

const getCat = (cId, idx) => { const c = catsByCareer[cId] || []; return c[Math.min(idx||0, c.length-1)] || null; };
const getSec = (dId, idx) => { const s = secsByDistrict[dId] || []; return s[idx||0] || null; };
const gDist = (n, prov) => districts.find(d => d.name===n && (!prov || d.province===prov));
const gDir = (prov) => dirs.find(d => d.province===prov);

const cIO  = careers.find(c => c.name.includes("Investigação Operativa"));
const cTC  = careers.find(c => c.name.includes("Técnica Criminalística"));
const cRP  = careers.find(c => c.name.includes("Registo"));
const cQTC = careers.find(c => c.name.includes("Quadro Técnico Comum"));
const dirGeral = dirs.find(d => d.name.includes("Geral"));
const dirMC = gDir("Cidade de Maputo");
const dirMP = gDir("Maputo Província");
const dirGaza = gDir("Gaza");
const dirInh = gDir("Inhambane");
const dirSof = gDir("Sofala");
const dirMan = gDir("Manica");
const dirTet = gDir("Tete");
const dirZam = gDir("Zambézia");
const dirNam = gDir("Nampula");
const dirNia = gDir("Niassa");
const dirCD  = gDir("Cabo Delgado");
const deptAdm = depts[0];

console.log("[SEED] cIO="+cIO?.name+" | cTC="+cTC?.name+" | cRP="+cRP?.name+" | cQTC="+cQTC?.name);

const mk = (id,nip,name,gender,bd,idN,nuit,addr,email,phone,utype,dirId,deptId,ddId,secId,cId,catId,prov,dist,adm,mstat,vinc,cargo,sal,cls,esc,loc) => ({id,nip,name,gender,birthDate:bd,idNumber:idN,nuit,address:addr,email,phone,unitType:utype,directorateId:dirId||null,departmentId:deptId||null,districtDirectorateId:ddId||null,sectionId:secId||null,careerId:cId||null,categoryId:catId||null,provinceId:prov,districtId:dist,status:"Ativo",admissionDate:adm,maritalStatus:mstat,vinculo:vinc,cargo,salary:sal,classe:cls,escalao:esc,localColocacao:loc});

const g = (obj, prop) => obj ? obj[prop] : null;
const emps = [
  mk("emp_001","SRN-2018-001","Antonio Jose Machava","Masculino","1978-03-12","BI-001234567B","100234567","Av. Vladimir Lenine 174 Maputo","a.machava@sernic.gov.mz","+258841234567","normal",g(dirGeral,"id"),null,null,null,g(cQTC,"id"),g(getCat(g(cQTC,"id"),0),"id"),"Cidade de Maputo","Maputo","2018-01-15","Casado","Efectivo","Director de RH","55000","5","3","Sede SERNIC"),
  mk("emp_002","SRN-2019-002","Maria da Graca Tembe","Feminino","1985-07-22","BI-002345678C","100345678","Rua das Flores 45 Maputo","m.tembe@sernic.gov.mz","+258822345678","normal",g(dirMC,"id"),g(deptAdm,"id"),null,null,g(cQTC,"id"),g(getCat(g(cQTC,"id"),2),"id"),"Cidade de Maputo","KaMpfumo","2019-03-01","Solteira","Efectivo","Tecnica Superior Adm","38000","3","2","Direccao Cidade Maputo"),
  mk("emp_003","SRN-2020-003","Carlos Eduardo Cossa","Masculino","1990-11-05","BI-003456789D","100456789","Av. 24 de Julho Polana Maputo","c.cossa@sernic.gov.mz","+258863456789","normal",g(dirMC,"id"),g(deptAdm,"id"),null,null,g(cQTC,"id"),g(getCat(g(cQTC,"id"),4),"id"),"Cidade de Maputo","KaMaxakeni","2020-06-10","Casado","Efectivo","Tecnico Profissional","28000","2","1","Direccao Cidade Maputo"),
  mk("emp_004","SRN-2015-004","Filomena Nhantumbo","Feminino","1975-02-28","BI-004567890E","100567890","Av. Julius Nyerere Maputo","f.nhantumbo@sernic.gov.mz","+258874567890","normal",g(dirMC,"id"),g(deptAdm,"id"),null,null,g(cQTC,"id"),g(getCat(g(cQTC,"id"),7),"id"),"Cidade de Maputo","Nlhamankulu","2015-09-01","Divorciada","Efectivo","Auxiliar Administrativa","18500","1","4","Direccao Cidade Maputo"),
  mk("emp_005","SRN-2017-005","Jaime Francisco Sitoe","Masculino","1982-08-14","BI-005678901F","100678901","Malhangalene Maputo","j.sitoe@sernic.gov.mz","+258845678901","district",g(dirMC,"id"),null,g(gDist("KaMpfumo"),"id"),g(getSec(g(gDist("KaMpfumo"),"id"),0),"id"),g(cIO,"id"),g(getCat(g(cIO,"id"),0),"id"),"Cidade de Maputo","KaMpfumo","2017-02-01","Casado","Efectivo","Inspector IO Principal","42000","4","2","Dir. Distrital KaMpfumo"),
  mk("emp_006","SRN-2021-006","Rosa Lucinda Mutemba","Feminino","1993-04-17","BI-006789012G","100789012","Alto-Mae Maputo","r.mutemba@sernic.gov.mz","+258826789012","district",g(dirMC,"id"),null,g(gDist("Nlhamankulu"),"id"),g(getSec(g(gDist("Nlhamankulu"),"id"),1),"id"),g(cTC,"id"),g(getCat(g(cTC,"id"),3),"id"),"Cidade de Maputo","Nlhamankulu","2021-01-10","Solteira","Contratado","Especialista TC","34000","3","1","Dir. Distrital Nlhamankulu"),
  mk("emp_007","SRN-2016-007","Helder Antonio Maputo","Masculino","1980-12-03","BI-007890123H","100890123","Maxaquene Maputo","h.maputo@sernic.gov.mz","+258867890123","district",g(dirMC,"id"),null,g(gDist("KaMaxakeni"),"id"),g(getSec(g(gDist("KaMaxakeni"),"id"),3),"id"),g(cRP,"id"),g(getCat(g(cRP,"id"),1),"id"),"Cidade de Maputo","KaMaxakeni","2016-08-15","Casado","Efectivo","Especialista Papiloscopia 1","36000","3","3","Dir. Distrital KaMaxakeni"),
  mk("emp_008","SRN-2022-008","Dina Paula Chirindza","Feminino","1995-06-20","BI-008901234I","100901234","KaMavota Maputo","d.chirindza@sernic.gov.mz","+258878901234","district",g(dirMC,"id"),null,g(gDist("KaMavota"),"id"),g(getSec(g(gDist("KaMavota"),"id"),7),"id"),g(cQTC,"id"),g(getCat(g(cQTC,"id"),6),"id"),"Cidade de Maputo","KaMavota","2022-03-01","Solteira","Contratado","Assistente Tecnica","21000","2","1","Dir. Distrital KaMavota"),
  mk("emp_009","SRN-2014-009","Manuel Joaquim Mabunda","Masculino","1972-10-30","BI-009012345J","101012345","Av. FPLM Boane","m.mabunda@sernic.gov.mz","+258849012345","district",g(dirMP,"id"),null,g(gDist("Boane"),"id"),g(getSec(g(gDist("Boane"),"id"),0),"id"),g(cIO,"id"),g(getCat(g(cIO,"id"),1),"id"),"Maputo Provincia","Boane","2014-04-20","Casado","Efectivo","Inspector IO 1","38500","4","5","Dir. Distrital Boane"),
  mk("emp_010","SRN-2019-010","Conceicao Beatriz Bila","Feminino","1988-01-15","BI-010123456K","101123456","Matola-Rio Matola","c.bila@sernic.gov.mz","+258820123456","district",g(dirMP,"id"),null,g(gDist("Matola"),"id"),g(getSec(g(gDist("Matola"),"id"),2),"id"),g(cTC,"id"),g(getCat(g(cTC,"id"),4),"id"),"Maputo Provincia","Matola","2019-07-01","Casada","Efectivo","Perito TC Principal","36000","3","2","Dir. Distrital Matola"),
  mk("emp_011","SRN-2023-011","Ernesto Albino Cuambe","Masculino","1997-05-08","BI-011234567L","101234567","3 de Fevereiro Manhica","e.cuambe@sernic.gov.mz","+258861234560","district",g(dirMP,"id"),null,g(districts.find(d => d.name.includes("Manh")),"id"),g(getSec(g(districts.find(d => d.name.includes("Manh")),"id"),6),"id"),g(cQTC,"id"),g(getCat(g(cQTC,"id"),8),"id"),"Maputo Provincia","Manhica","2023-01-05","Solteiro","Contratado","Agente de Servico","16500","1","1","Dir. Distrital Manhica"),
  mk("emp_012","SRN-2018-012","Sofia Margarida Guambe","Feminino","1983-09-25","BI-012345678M","101345678","Rua Principal Marracuene","s.guambe@sernic.gov.mz","+258872345670","district",g(dirMP,"id"),null,g(districts.find(d => d.name==="Marracuene"),"id"),g(getSec(g(districts.find(d => d.name==="Marracuene"),"id"),1),"id"),g(cRP,"id"),g(getCat(g(cRP,"id"),4),"id"),"Maputo Provincia","Marracuene","2018-06-01","Casada","Efectivo","Perito Papiloscopia Principal","35000","3","3","Dir. Distrital Marracuene"),
  mk("emp_013","SRN-2020-013","Tomas Elias Simbine","Masculino","1991-07-11","BI-013456789N","101456789","Av. Eduardo Mondlane Namaacha","t.simbine@sernic.gov.mz","+258843456780","district",g(dirMP,"id"),null,g(districts.find(d => d.name==="Namaacha"),"id"),g(getSec(g(districts.find(d => d.name==="Namaacha"),"id"),4),"id"),g(cIO,"id"),g(getCat(g(cIO,"id"),5),"id"),"Maputo Provincia","Namaacha","2020-09-14","Solteiro","Efectivo","Subinspector IO 1","30000","3","1","Dir. Distrital Namaacha"),
  mk("emp_014","SRN-2013-014","Jacinto Gregorio Langa","Masculino","1970-11-18","BI-014567890O","101567890","Av. Samora Machel Xai-Xai","j.langa@sernic.gov.mz","+258824567890","district",g(dirGaza,"id"),null,g(gDist("Xai-Xai"),"id"),g(getSec(g(gDist("Xai-Xai"),"id"),0),"id"),g(cIO,"id"),g(getCat(g(cIO,"id"),0),"id"),"Gaza","Xai-Xai","2013-02-10","Casado","Efectivo","Inspector IO Principal","43000","4","6","Dir. Distrital Xai-Xai"),
  mk("emp_015","SRN-2021-015","Lurdes Cecilia Macie","Feminino","1992-03-07","BI-015678901P","101678901","Rua Liberdade Chibuto","l.macie@sernic.gov.mz","+258865678901","district",g(dirGaza,"id"),null,g(gDist("Chibuto"),"id"),g(getSec(g(gDist("Chibuto"),"id"),2),"id"),g(cTC,"id"),g(getCat(g(cTC,"id"),7),"id"),"Gaza","Chibuto","2021-05-03","Casada","Contratado","Tecnico TC Principal","29000","2","2","Dir. Distrital Chibuto"),
  mk("emp_016","SRN-2017-016","Pedro Marcos Bila","Masculino","1986-01-29","BI-016789012Q","101789012","Bairro Pesqueira Chokwe","p.bila@sernic.gov.mz","+258876789012","district",g(dirGaza,"id"),null,g(districts.find(d => d.name.includes("hókw")),"id"),g(getSec(g(districts.find(d => d.name.includes("hókw")),"id"),5),"id"),g(cQTC,"id"),g(getCat(g(cQTC,"id"),5),"id"),"Gaza","Chokwe","2017-11-01","Casado","Efectivo","Tecnico","25000","2","3","Dir. Distrital Chokwe"),
  mk("emp_017","SRN-2016-017","Ines Amelia Mondlane","Feminino","1981-06-14","BI-017890123R","101890123","Av. Independencia Inhambane","i.mondlane@sernic.gov.mz","+258847890123","district",g(dirInh,"id"),null,g(gDist("Inhambane","Inhambane"),"id"),g(getSec(g(gDist("Inhambane","Inhambane"),"id"),0),"id"),g(cIO,"id"),g(getCat(g(cIO,"id"),2),"id"),"Inhambane","Inhambane","2016-03-15","Divorciada","Efectivo","Inspector IO 2","36000","4","4","Dir. Distrital Inhambane"),
  mk("emp_018","SRN-2022-018","Alfredo Custodio Viegas","Masculino","1994-08-21","BI-018901234S","101901234","Rua do Turismo Vilankulo","a.viegas@sernic.gov.mz","+258828901234","district",g(dirInh,"id"),null,g(gDist("Vilankulo"),"id"),g(getSec(g(gDist("Vilankulo"),"id"),3),"id"),g(cRP,"id"),g(getCat(g(cRP,"id"),6),"id"),"Inhambane","Vilankulo","2022-08-01","Solteiro","Contratado","Tecnico Papiloscopia 1","27000","2","1","Dir. Distrital Vilankulo"),
  mk("emp_019","SRN-2015-019","Octavio Bernardo Nhampule","Masculino","1977-04-03","BI-019012345T","102012345","Rua Correia de Brito Beira","o.nhampule@sernic.gov.mz","+258869012345","district",g(dirSof,"id"),null,g(gDist("Beira"),"id"),g(getSec(g(gDist("Beira"),"id"),0),"id"),g(cIO,"id"),g(getCat(g(cIO,"id"),3),"id"),"Sofala","Beira","2015-01-19","Casado","Efectivo","Inspector IO 3","34000","3","4","Dir. Distrital Beira"),
  mk("emp_020","SRN-2023-020","Gloria Rosaria Cuna","Feminino","1998-02-16","BI-020123456U","102123456","Bairro Munhava Dondo","g.cuna@sernic.gov.mz","+258870123456","district",g(dirSof,"id"),null,g(gDist("Dondo"),"id"),g(getSec(g(gDist("Dondo"),"id"),7),"id"),g(cQTC,"id"),g(getCat(g(cQTC,"id"),9),"id"),"Sofala","Dondo","2023-04-03","Solteira","Contratado","Auxiliar Servente","13500","1","1","Dir. Distrital Dondo"),
  mk("emp_021","SRN-2018-021","Benjamim Lourenco Cumbe","Masculino","1984-10-12","BI-021234567V","102234567","Rua Sagrada Familia Chimoio","b.cumbe@sernic.gov.mz","+258841234561","district",g(dirMan,"id"),null,g(gDist("Chimoio"),"id"),g(getSec(g(gDist("Chimoio"),"id"),1),"id"),g(cTC,"id"),g(getCat(g(cTC,"id"),1),"id"),"Manica","Chimoio","2018-09-01","Casado","Efectivo","Especialista TC 1","38000","4","3","Dir. Distrital Chimoio"),
  mk("emp_022","SRN-2020-022","Esperanca Dina Correia","Feminino","1989-07-31","BI-022345678W","102345678","Bairro Manica","e.correia@sernic.gov.mz","+258822345671","district",g(dirMan,"id"),null,g(gDist("Manica","Manica"),"id"),g(getSec(g(gDist("Manica","Manica"),"id"),5),"id"),g(cIO,"id"),g(getCat(g(cIO,"id"),7),"id"),"Manica","Manica","2020-11-16","Solteira","Efectivo","Agente IO Principal","28500","3","2","Dir. Distrital Manica"),
  mk("emp_023","SRN-2014-023","Celestino Horacio Mafumo","Masculino","1974-05-09","BI-023456789X","102456789","Av. Samora Machel Tete","c.mafumo@sernic.gov.mz","+258863456781","district",g(dirTet,"id"),null,g(gDist("Tete","Tete"),"id"),g(getSec(g(gDist("Tete","Tete"),"id"),0),"id"),g(cRP,"id"),g(getCat(g(cRP,"id"),0),"id"),"Tete","Tete","2014-07-01","Casado","Efectivo","Especialista Papiloscopia Principal","40000","4","5","Dir. Distrital Tete"),
  mk("emp_024","SRN-2022-024","Virginia Fatima Nhamusso","Feminino","1993-12-01","BI-024567890Y","102567890","Bairro Matundo Moatize","v.nhamusso@sernic.gov.mz","+258874567891","district",g(dirTet,"id"),null,g(gDist("Moatize"),"id"),g(getSec(g(gDist("Moatize"),"id"),2),"id"),g(cTC,"id"),g(getCat(g(cTC,"id"),6),"id"),"Tete","Moatize","2022-02-14","Casada","Contratado","Perito TC 2","32000","3","1","Dir. Distrital Moatize"),
  mk("emp_025","SRN-2017-025","Raul Domingos Macuacua","Masculino","1979-08-17","BI-025678901Z","102678901","Av. 1 de Maio Quelimane","r.macuacua@sernic.gov.mz","+258845678902","district",g(dirZam,"id"),null,g(gDist("Quelimane"),"id"),g(getSec(g(gDist("Quelimane"),"id"),1),"id"),g(cIO,"id"),g(getCat(g(cIO,"id"),4),"id"),"Zambezia","Quelimane","2017-05-22","Casado","Efectivo","Subispector IO Principal","33000","3","3","Dir. Distrital Quelimane"),
  mk("emp_026","SRN-2019-026","Adelaide Leonor Chissano","Feminino","1987-11-23","BI-026789012A","102789012","Bairro Mulevala Gurue","a.chissano@sernic.gov.mz","+258826789013","district",g(dirZam,"id"),null,g(districts.find(d => d.name.includes("Gur")),"id"),g(getSec(g(districts.find(d => d.name.includes("Gur")),"id"),3),"id"),g(cQTC,"id"),g(getCat(g(cQTC,"id"),3),"id"),"Zambezia","Gurue","2019-10-07","Casada","Efectivo","Tecnico Profissional AP","30000","3","2","Dir. Distrital Gurue"),
  mk("emp_027","SRN-2016-027","Domingos Salvo Macamo","Masculino","1976-03-19","BI-027890123B","102890123","Av. Paulo Samuel Kankhomba Nampula","d.macamo@sernic.gov.mz","+258867890124","district",g(dirNam,"id"),null,g(gDist("Nampula","Nampula"),"id"),g(getSec(g(gDist("Nampula","Nampula"),"id"),0),"id"),g(cIO,"id"),g(getCat(g(cIO,"id"),0),"id"),"Nampula","Nampula","2016-01-11","Casado","Efectivo","Inspector IO Principal","42500","4","4","Dir. Distrital Nampula"),
  mk("emp_028","SRN-2021-028","Natalia Bela Armando","Feminino","1990-09-06","BI-028901234C","102901234","Bairro Muhala Angoche","n.armando@sernic.gov.mz","+258878901235","district",g(dirNam,"id"),null,g(gDist("Angoche"),"id"),g(getSec(g(gDist("Angoche"),"id"),6),"id"),g(cRP,"id"),g(getCat(g(cRP,"id"),3),"id"),"Nampula","Angoche","2021-07-19","Solteira","Contratado","Especialista Papiloscopia 3","31000","3","1","Dir. Distrital Angoche"),
  mk("emp_029","SRN-2019-029","Silvano Faustino Pondja","Masculino","1985-06-27","BI-029012345D","103012345","Bairro Mitande Lichinga","s.pondja@sernic.gov.mz","+258849012346","district",g(dirNia,"id"),null,g(gDist("Lichinga"),"id"),g(getSec(g(gDist("Lichinga"),"id"),2),"id"),g(cTC,"id"),g(getCat(g(cTC,"id"),5),"id"),"Niassa","Lichinga","2019-12-02","Casado","Efectivo","Perito TC 1","35500","3","2","Dir. Distrital Lichinga"),
  mk("emp_030","SRN-2020-030","Dercio Augusto Muhate","Masculino","1991-04-14","BI-030123456E","103123456","Bairro Majengo Pemba","d.muhate@sernic.gov.mz","+258820123457","district",g(dirCD,"id"),null,g(districts.find(d => d.name==="Pemba"),"id"),g(getSec(g(districts.find(d => d.name==="Pemba"),"id"),0),"id"),g(cIO,"id"),g(getCat(g(cIO,"id"),6),"id"),"Cabo Delgado","Pemba","2020-08-10","Casado","Efectivo","Subinspector IO 2","31500","3","2","Dir. Distrital Pemba"),
];

const ins = db.prepare("INSERT INTO employees (id,nip,name,gender,birth_date,id_number,nuit,address,email,phone,photo,unit_type,directorate_id,department_id,division_id,district_directorate_id,section_id,career_id,category_id,province_id,district_id,status,is_active,admission_date,extra_data,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,NULL,?,?,?,?,?,?,?,?,?,?,?,1,?,?,datetime('now'),datetime('now'))");
let ok=0,sk=0;
const tx = db.transaction(() => {
  for(const e of emps){
    const ex = db.prepare("SELECT id FROM employees WHERE nip=?").get(e.nip);
    if(ex){ console.log("[SKIP] "+e.nip); sk++; continue; }
    const ed = JSON.stringify({maritalStatus:e.maritalStatus||"",vinculo:e.vinculo||"Efectivo",cargo:e.cargo||"",salary:e.salary||"",classe:e.classe||"",escalao:e.escalao||"",localColocacao:e.localColocacao||"",nib:"84"+e.nip.replace(/[^0-9]/g,"").padStart(11,"0").slice(-11)});
    try{
      ins.run(e.id,e.nip,e.name,e.gender,e.birthDate,e.idNumber,e.nuit,e.address,e.email,e.phone,e.unitType||"normal",e.directorateId,e.departmentId,null,e.unitType==="district"?e.districtDirectorateId:null,e.sectionId,e.careerId,e.categoryId,e.provinceId,e.districtId,e.status||"Ativo",e.admissionDate,ed);
      console.log("[OK] "+e.id+" - "+e.name); ok++;
    }catch(err){ console.error("[ERRO] "+e.name+": "+err.message); }
  }
});
tx();
console.log("");
console.log("[SEED] ===============================");
console.log("[SEED] Inseridos : "+ok);
console.log("[SEED] Ignorados : "+sk);
console.log("[SEED] Total na BD: "+db.prepare("SELECT COUNT(*) as c FROM employees").get().c);
console.log("[SEED] ===============================");
db.close();
