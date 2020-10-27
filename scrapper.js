const puppeteer = require('puppeteer');

try{
    (async () => {
        const listingURL = 'https://www.google.com/travel/hotels?utm_campaign=sharing&utm_medium=link&utm_source=htls&hrf=CgUIlgEQACIDRVVSKhYKBwjkDxALGAcSBwjkDxALGAgYASgAsAEAWAFoAZoBLxIGU2xpZW1hGiUweDEzMGU0NTM5ODBkY2I4NjU6MHhhNzM1NGQ3MjFmMTQ1OTQ5ogETCgkvbS8wNWY3cHQSBlNsaWVtYZIBAiAB&rp=OAFIAg&destination=Sliema&ap=MABoAA';
        
        const browser = await puppeteer.launch({
            headless:false,
            defaultViewport:null,
            userDataDir:'/tmp/googleHotelCache'
        });
        
        //goto sliema listing page
        const listingPage = await browser.newPage();
        await listingPage.goto(listingURL,{waitForNavigation:'load'});
    
        //agree with google terms modal/popup
        // await listingPage.click('div#introAgreeButton');//not working due to iframe
        //emulate TAB naviagtion since iframe makes selector navigation a pain
        for (let i = 0; i < 10; i++) {
            await listingPage.keyboard.press("Tab");
        }

        await listingPage.keyboard.press("Enter");

        //scrape pages
        var scrappedProperties = await scrapePropertiesFromListingPage(listingPage);
        // console.log(scrappedProperties);

        //click next button and repeat
        const nextBtnXPath = '//span[contains (text(), "Next")]';
        var nextButtonElements = await listingPage.$x(nextBtnXPath);
        while(nextButtonElements.length  > 0){

            await nextButtonElements[nextButtonElements.length-1].click();

            // await listingPage.waitForNavigation({ 
                // waitUntil: 'networkidle2'
            // })
            await delay(1000);
  
            scrappedProperties = scrappedProperties.concat(await scrapePropertiesFromListingPage(listingPage));

            nextButtonElements = await listingPage.$x(nextBtnXPath);
        }
        
        await saveToCSV(scrappedProperties);

        console.log(scrappedProperties.length,'2nd');

    })();
}catch(e){
    console.log(e);
}


/**
 * 
 * @param {Page} listingPage 
 */
async function  scrapePropertiesFromListingPage(listingPage){
    const  listingResults = await listingPage.$$('.l5cSPd > c-wiz')
    const scrappedProperties = [];

    for (let i = 0; i < listingResults.length; i++) {           
        // const url   = await listingResults[i].$eval('a',a => a.getAttribute('href'));
        try{
            const url   = await listingResults[i].$eval('a',(a) =>{
                // console.log(a);
                return  'https://www.google.com' + a.getAttribute('href');
            });
    
            const title = await listingResults[i].$eval('h2',a =>{
                console.log(a);
                return a.innerText
            });
         
            const rating = await listingResults[i].$eval('.NPG4zc>.sSHqwe:not(.XLC8M)',a =>{
                console.log(a);
                return a.innerText
            });
            
    
            let property = {
                'url'   : url,
                'title' : title,
                'rating': rating
            }
            
            // console.log(property);

            scrappedProperties.push(property);
        }catch(e){//not a property since dom elem does not contain all the required html elements
            continue;
        }
        
      }

      return scrappedProperties;
}

async function saveToCSV(properties){
    let csv = 'title,rating,url\n';
    for(let prop of properties){
        csv += `${prop.title},${prop.rating},${prop.url}\n` 
    }
    
    fs = require('fs');


    fs.writeFile('sliema_hotels.csv', csv, function (err) {
        if (err) return console.log(err);
        console.info('file saved');
    });
}


function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time)
    });
 }
 