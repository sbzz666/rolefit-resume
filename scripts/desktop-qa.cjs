const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises');
const path=require('node:path');
app.setPath('userData',path.resolve('tmp/desktop-qa-profile'));
require('../desktop/main.cjs');
app.whenReady().then(async()=>{
 try{
  const win=BrowserWindow.getAllWindows()[0];
  if(win.webContents.isLoading()) await new Promise(r=>win.webContents.once('did-finish-load',r));
  await win.webContents.executeJavaScript('openSettings()');
  await win.webContents.executeJavaScript('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))');
  await new Promise(resolve=>setTimeout(resolve,600));
  await fs.mkdir('tmp/qa',{recursive:true});
  await fs.writeFile('tmp/qa/settings.png',(await win.webContents.capturePage()).toPNG());
  const layout=await win.webContents.executeJavaScript(`(()=>{const rect=id=>{const r=document.querySelector(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};return {dialog:rect('.settings-dialog'),key:rect('#deepseekKey'),model:rect('#deepseekModel'),checkbox:rect('#saveDeepseekKey'),display:getComputedStyle(document.querySelector('.settings-dialog')).display}})()`);
  if(layout.key.width<300||layout.model.width<400||layout.checkbox.width>20||layout.display!=='flex') throw Error('Layout regression: '+JSON.stringify(layout));
  const key=process.env.DEEPSEEK_API_KEY;
  const output={layout};
  if(key){
   output.connection=await win.webContents.executeJavaScript(`window.rolefitDesktop.testConnection(${JSON.stringify({key,model:'deepseek-flash'})})`);
   await win.webContents.executeJavaScript(`window.rolefitDesktop.saveConfig(${JSON.stringify({key,model:'deepseek-flash',saveKey:true})})`);
   output.saved=await win.webContents.executeJavaScript('window.rolefitDesktop.getConfig()');
   const stored=await fs.readFile(path.join(app.getPath('userData'),'deepseek.json'),'utf8');
   if(stored.includes(key)) throw Error('Plaintext secret persisted');
   output.encryptedAtRest=true;
   output.generation=await win.webContents.executeJavaScript(`window.rolefitDesktop.generate({company:'测试公司',role:'Java开发工程师',jd:'Java、Spring Boot、MySQL；负责后端接口开发',background:'未提供真实经历，仅生成模拟项目'})`);
   if(!output.generation.result.projects?.length) throw Error('Missing generated projects');
   output.generation={model:output.generation.model,projects:output.generation.result.projects.length};
   await win.webContents.executeJavaScript(`window.rolefitDesktop.saveConfig({saveKey:false,model:'deepseek-flash'})`);
   output.sessionOnly=!(JSON.parse(await fs.readFile(path.join(app.getPath('userData'),'deepseek.json'),'utf8')).encryptedKey);
  }else output.connection='SKIPPED: no environment key';
  await fs.writeFile('tmp/qa/results.json',JSON.stringify(output,null,2));
  console.log(JSON.stringify(output));app.exit(0);
 }catch(error){console.error(error.message);app.exit(1)}
});

