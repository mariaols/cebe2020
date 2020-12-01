if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
var fs = require('fs');
var random_useragent = require('random-useragent');
const Nightmare = require('nightmare')
var showBrowser = false;
if (process.env.SHOW === 'true') {
  showBrowser = true;
}
if (process.env.SHOW === 'false') {
  showBrowser = false;
}


var proxies = fs.readFileSync('proxies.txt').toString().split("\n");
var links = fs.readFileSync('link.txt').toString().split("\n");
var emails = fs.readFileSync('email.txt').toString().split("\n");
var fnames = fs.readFileSync('fname.txt').toString().split("\n");
var lnames = fs.readFileSync('lname.txt').toString().split("\n");
var resumes = fs.readFileSync('resume.txt').toString().split("\n");
var MatrixOfJobs = [];

var maxThreads = parseInt(process.env.THREADS);
var pageNumber = 1;
var AllLinks = [];

var getAllLinks = function(page,i){
var proxie = proxies[Math.floor(Math.random() * proxies.length)];
  var newUserAgent = random_useragent.getRandom();
  console.log('['+i+']'+'Using: '+ newUserAgent);
  console.log('['+i+']'+"Proxie:" + proxie);
  const nightmare = Nightmare({ show: showBrowser, userAgent: newUserAgent,switches: {
   'proxy-server':  'socks5://'+proxie, 'ignore-certificate-errors': true // set the proxy server here ...
 },gotoTimeout: 90000 })

  var maxPages = 0;
  nightmare
    .goto(links[i]+"&page_number="+page)
    .evaluate(() => {
      var arrayOfJobs = document.querySelectorAll('.job-listing-item');
      var ArrayOfLinks = [];
      for (var i = 0; i < arrayOfJobs.length; i++) {
        ArrayOfLinks.push(arrayOfJobs[i].href)
      }
  return [document.querySelectorAll('[id="job-count"]')[0].innerText,ArrayOfLinks];
}).end().then( async (text) => {
  maxPages = Math.round(parseInt(text[0].replace('More Than', '').replace('Jobs Found', '').replace(',', ''))/25);
  if (typeof AllLinks[i] === "undefined") {
    AllLinks[i] = [];
  }
  AllLinks[i] = AllLinks[i].concat(text[1]);
  console.log('['+i+']'+'Found '+ AllLinks[i].length +" jobs.");
  if (page<=maxPages) {
    await  nightmare.end();
    getAllLinks(page+1,i)
  } else {
  await   nightmare.end();
    doOnce(i,0);
  }
}) .catch( async (error) => {
  await  nightmare.end();
    getAllLinks(page,i)
    console.error('['+i+']'+'Job failed:', error)
  })

}


var doOnce = function(i,j) {
  var noJob = false;
 var proxie = proxies[Math.floor(Math.random() * proxies.length)];
console.log('['+i+']'+"Proxie:" + proxie);
  var newUserAgent = random_useragent.getRandom();
  console.log('['+i+']'+'Using: '+ newUserAgent);
  const nightmare = Nightmare({ show: showBrowser, userAgent: newUserAgent,switches: {
   'proxy-server':  'socks5://'+proxie,'proxy-bypass-list':'<-loopback>' // set the proxy server here ...
},gotoTimeout: 90000 });

  var index1 = resumes[i].indexOf('{')
  var index2 = resumes[i].indexOf('}')
  var index3 = resumes[i].length;
  var textArray = resumes[i].substring(index1+1, index2);
  var array = textArray.split('|');
  var resume = array[Math.floor(Math.random() * array.length)] + resumes[i].substring(index2+1, index3);

  nightmare
    .goto(AllLinks[i][j])
    .click('a[data-gtm="job-action|apply-internal-bottom"]')
    .wait(1000)
    .evaluate(() => {
      if (typeof document.querySelector('.blue-text') !== "undefined") {
        if (document.querySelector('.blue-text') !== null) {
          document.querySelector('.blue-text').click()
        }
      }

      if (document.querySelector('.pb').innerHTML === "Unfortunately, this job is no longer available") {
        return true;
      }


}).then( function(should) {
  if (should === true) {
  noJob = should;
  }
  nightmare.wait(1500)
      .type('input[name="firstname"]',fnames[i])
      .type('input[name="lastname"]',lnames[i])
      .type('input[type="email"]',emails[i])
      .evaluate(() => {
        if (typeof document.querySelectorAll('label[for="have_requi_yes"]')[0] !== "undefined") {
          document.querySelectorAll('label[for="have_requi_yes"]')[0].click();
        }
  }).click('div[id="resume-input"]')
      .wait(500)
      .click('a[id="js-copy-paste-trigger"]')
      .wait(500)
      .type('textarea[name="copy_paste"]',resume)
      .click('a[id="js-copy-paste-validate"]')
      .wait(500)
      .click('button[type="submit"]')
      .wait(1000)
      .click('button[type="submit"]')
      .wait(1000)
      .end()
      .then( async function() {
        if (j === AllLinks[i].length-1) {
            console.log('['+i+']'+'Finished applying to all jobs for '+ emails[i]);
            if (i+maxThreads < emails.length ) {
              await  nightmare.end();
                getAllLinks(i+maxThreads);
            }
        } else {
          console.log('['+i+']'+'Finished applying to '+ AllLinks[i][j]);
          if (j+1 < AllLinks[i].length) {
            await  nightmare.end();
              doOnce(i,j+1);
          }
        }
      }
    )  .catch( async (error) => {
      if (error.toString().indexOf('a[data-gtm="job-action|apply-internal-bottom"]') !== -1) {
          noJob = true;
      }
            if (error.toString().indexOf('focus') !== -1) {
                noJob = true;
            }
            if (error.toString().indexOf('innerHTML') !== -1) {
                noJob = true;
            }
          if (noJob) {
            await  nightmare.end();
              doOnce(i,j+1);
          } else {
            await  nightmare.end();
              doOnce(i,j);
          }
          console.error('['+i+']'+'Job failed:', error)
        })
}
).catch(  async (error) => {

if (error.toString().indexOf('a[data-gtm="job-action|apply-internal-bottom"]') !== -1) {
    noJob = true;
}
      if (error.toString().indexOf('focus') !== -1) {
          noJob = true;
      }
      if (error.toString().indexOf('innerHTML') !== -1) {
          noJob = true;
      }
      if (noJob) {
      await   nightmare.end();
          doOnce(i,j+1);
      } else {
          await  nightmare.end();
          doOnce(i,j);
      }

      console.error('['+i+']'+'Job failed:', error)
    })
}


for (var i = 0; i < maxThreads; i++) {
  getAllLinks(1,i);
}
