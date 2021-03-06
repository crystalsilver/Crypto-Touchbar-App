function getSelectedFromPreview() {
    const cryptoPreview = document.getElementsByClassName('touchbar-element crypto');

    let selectedCryptos = [];

    // Since cryptoElements returns a HTMLCollection, do this hack to get the Array elements.
    [].forEach.call(cryptoPreview, (cryptoItem) => {
        selectedCryptos.push(cryptoItem.dataset.ticker);
    });
    return selectedCryptos;
}

function updatePreviewColour(elm) {
    const id = elm.styleElement.id,
        cryptoColour = document.getElementById(id),
        cryptoTouch = document.getElementById(id.replace('-colour', '-touch'));

    if (cryptoTouch) {
        cryptoTouch.style.backgroundColor = cryptoColour.style.backgroundColor;
    }
}

function updatePreviewSVGColour(elm) {
    const id = elm.styleElement.id,
        cryptoColour = document.getElementById(id),
        cryptoTouch = document.getElementById(id.replace('-svg-colour', '-touch-icon'));

    if (cryptoTouch) {
        cryptoTouch.style.fill = cryptoColour.style.backgroundColor;
    }
}
function updatePreviewFiat() {
    const selectedFiatObj = getSelectedFiatValueObject(),
        cryptoElements = document.getElementsByClassName('crypto');

    // Since cryptoElements returns a HTMLCollection, do this hack to get the Array elements.
    [].forEach.call(cryptoElements, (crypto) => {
        let touchText = crypto.getElementsByTagName('span')[0].innerHTML;
        touchText = selectedFiatObj.symbol + ' ' + touchText.substring(touchText.indexOf(' ') + 1);
        crypto.getElementsByTagName('span')[0].innerHTML = touchText;
    });
}

function getSelectedFiatOption() {
    const fiat = document.getElementById('fiat');

    return fiat.options[fiat.selectedIndex].value;
}

function getSelectedFiatValueObject() {
    const selectedOp = getSelectedFiatOption();

    return getSelectedValue(new fiatJSON(), 'ticker', selectedOp)[0];
}

function getSelectedValue(array, key, value) {
    return array.filter((obj) => {
        return obj[key] === value;
    });
}

function addCrypto(event) {
    const target = event.target;

    if (target.checked) {

        const cryptoTouch = document.createElement('div'),
            imgTouch = document.createElement('img'),
            selectedFiatObj = getSelectedFiatValueObject(),
            targetColour = document.getElementById(target.dataset.ticker + '-colour'),
            text = document.createElement('span'),
            touchArea = document.getElementById('crypto-touchbar-area');

        cryptoTouch.setAttribute('id', target.dataset.ticker + '-touch');
        cryptoTouch.className = 'touchbar-element crypto';
        cryptoTouch.dataset.ticker = target.dataset.ticker;

        cryptoTouch.style.backgroundColor = targetColour.style.backgroundColor;
        touchArea.appendChild(cryptoTouch);

        imgTouch.className = 'svg touchbar-crypto-icon';
        imgTouch.setAttribute('id', target.dataset.ticker + '-touch-icon');
        imgTouch.setAttribute('src', target.dataset.icon);
        imgTouch.style.width = '22';
        imgTouch.style.height = '22';
        cryptoTouch.appendChild(imgTouch);

        text.innerHTML = selectedFiatObj.symbol + ' 000.00';
        cryptoTouch.appendChild(text);

        // replace img.svg with inline svgs
        document.querySelectorAll('img.svg').forEach(function(element) {
            var imgID = element.getAttribute('id');
            var imgClass = element.getAttribute('class');
            var imgURL = element.getAttribute('src');

            xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if(xhr.readyState == 4 && xhr.status == 200) {
                    var svg = xhr.responseXML.getElementsByTagName('svg')[0];

                    if(imgID != null) {
                         svg.setAttribute('id', imgID);
                    }

                    if(imgClass != null) {
                         svg.setAttribute('class', imgClass + ' replaced-svg');
                    }

                    svg.removeAttribute('xmlns:a');

                    if(!svg.hasAttribute('viewBox') && svg.hasAttribute('height') && svg.hasAttribute('width')) {
                        svg.setAttribute('viewBox', '0 0 ' + svg.getAttribute('height') + ' ' + svg.getAttribute('width'));
                    }
                    element.parentElement.replaceChild(svg, element);
                }
            }
            xhr.open('GET', imgURL, true);
            xhr.send(null);
        });


    } else {
        const cryptoTouch = document.getElementById(target.dataset.ticker + '-touch');

        cryptoTouch.parentNode.removeChild(cryptoTouch);
    }
}

function generateJSON() {
    const selectedFiatObj = getSelectedFiatValueObject(),

        // Get selected cryptos
        selection = getSelectedFromPreview(),

        // Get script refresh interval
        refreshTimer = document.getElementById('refreshInterval').innerHTML,

        // Get value of group toggle box
        groupBool = document.getElementById('groupcheckbox').checked,

        closeGroup = new closeGroupElement(),
        apiSelector = document.querySelector('input[name="api-type"]:checked'),
        formatSelector = document.querySelector('input[name="variance-type"]:checked'),
        dateTimeSelector = document.getElementById('flatpicker-output'),
        dateTimeSelectorString = document.getElementById('flatpicker-output-string');

    let output = new mainStruct(),
        coinArray = [];

    if (selection.length == 0){
        alert('No coins selected');
        throw new Error("No coins selected!");
    }

     // build formatting options for output
     let outputFormat = '';

     var commaFormat = document.getElementById('comma-separate');
     var decimalFormat = document.querySelector('input[name="decimal-count"]:checked');

     if (commaFormat.checked){
         outputFormat += ",";
     }
     if (decimalFormat.dataset.count != '∞') {
        outputFormat += "." + decimalFormat.dataset.count + "f";
     }

     if (outputFormat != '') {
        outputFormat = ":0" + outputFormat;
     }

    selection.forEach((item, i) => {
        let coin = new cryptoElement(),
        iconCanv = document.createElement('canvas'),
        iconSVG = document.getElementById(item+'-touch-icon').outerHTML;

        // add svgs to hidden canvas so they can be exported to base64 png for BTT
        canvg(iconCanv, iconSVG, {
            ignoreMouse: true,
            ignoreAnimation: true
        });
        iconCanv.id = item;
        document.getElementById('canvas-area').appendChild(iconCanv);

        coin.BTTWidgetName = item;
        coin.BTTOrder = i;

        // Get and set element colour
        let coinColour = document.getElementById(item + '-colour').style.backgroundColor;
        let rgbVals = coinColour.match(/\d+/g);

        coin.BTTTriggerConfig.BTTTouchBarButtonColor = rgbVals.join(', ') + ', 255';

        // get canvas svg and convert it to png base64 for output to BTT
        let base64PNG = document.getElementById(item).toDataURL('image/png');
        base64PNG = base64PNG.replace('data:image/png;base64,', '');

        coin.BTTIconData = base64PNG;

        let apiCall = new APIPrice(),
            extraOptions = '';

        let apiRes = apiCall[apiSelector.dataset.apitype].response,
            apiOut = apiCall[apiSelector.dataset.apitype][formatSelector.dataset.variance + '-output'],
            apiErr = apiCall[apiSelector.dataset.apitype].error;

        if (apiSelector.dataset.apitype == 'historical'){
            if (!dateTimeSelector.value) {
                alert('No date/time selected!');
                throw new Error("No date/time selected!");
            }
            extraOptions = 'limit=1&aggregate=1&toTs=' + dateTimeSelector.value;
        }


        apiRes = apiRes
            .replace(/\*\*CRYPTO\*\*/g, coin.BTTWidgetName)
            .replace(/\*\*FIAT\*\*/g, selectedFiatObj.ticker)
            .replace(/\*\*FORMAT\*\*/g, outputFormat)
            .replace(/\*\*EXTRAOPTIONS\*\*/g, extraOptions);
        
        apiOut = apiOut
            .replace(/\*\*FIATSYMB\*\*/g, selectedFiatObj.symbol);


        if (formatSelector.dataset.variance == 'user-percentage'){
            var userPercent = document.getElementById('user-percentage').value;
            userPercent = userPercent / 100;
            apiOut = apiOut.replace(/\*\*PERCENT\*\*/g, userPercent);
        }


        coin.BTTTriggerConfig.BTTTouchBarAppleScriptString = coin.BTTTriggerConfig.BTTTouchBarAppleScriptString
            .replace(/\*\*RESPONSE\*\*/g, apiRes)
            .replace(/\*\*OUTPUT\*\*/g, apiOut)
            .replace(/\*\*ERROR\*\*/g, apiErr);

        coin.BTTTriggerConfig.BTTTouchBarScriptUpdateInterval = parseInt(refreshTimer);

        coinArray.push(coin);
    });

    // add the closing group element
    closeGroup.BTTOrder = selection.length;

    if (groupBool && apiSelector.dataset.apitype == 'live') {
        coinArray.push(closeGroup);
        output.BTTPresetContent[0].BTTTriggers[0].BTTAdditionalActions = coinArray;
        output.BTTPresetContent[0].BTTTriggers[0].BTTIconData = selectedFiatObj.icon;
    }
    else if (groupBool && apiSelector.dataset.apitype == 'historical') {
        coinArray.push(closeGroup);
        output.BTTPresetContent[0].BTTTriggers[0].BTTAdditionalActions = coinArray;
        output.BTTPresetContent[0].BTTTriggers[0].BTTIconData = selectedFiatObj.icon;
        output.BTTPresetContent[0].BTTTriggers[0].BTTTouchBarButtonName = dateTimeSelectorString.value;
    }
    else {
        output.BTTPresetContent[0].BTTTriggers = coinArray;
    }

    output.BTTPresetName = output.BTTPresetName + "-" +selectedFiatObj.ticker;

    // Purge all Canvas SVGs after Export
    var myNode = document.getElementById("canvas-area");
    while (myNode.firstChild) {
        myNode.removeChild(myNode.firstChild);
    }

    return output;
}

function outputJson(el){

    var output = generateJSON(),
        selectedFiatObj = getSelectedFiatValueObject(); 
    // trigger download of end result object
    const data = 'text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(output));

    el.setAttribute('href', 'data:' + data);
    el.setAttribute('download', 'Crypto-Touchbar-App-' + selectedFiatObj.ticker + '.json');
}

function outputDirect(el){

    var output = generateJSON(),
        selectedFiatObj = getSelectedFiatValueObject(); 
    // trigger import of end result object
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(output))));

    el.setAttribute('href', 'btt://jsonimport/' + data);
}

function addCoin(coinData) {
    const cryptoSelector = document.createElement('div'),
    element = document.createElement('input'),
    text = document.createElement('label'),
    colour = document.createElement('button'),
    icon = document.createElement('img'),
    colourSVG = document.createElement('button');

    element.type = 'checkbox';

    element.dataset.icon = coinData.Icon;
    element.dataset.ticker = coinData.Ticker;
    element.dataset.name = coinData.Name;
    element.dataset.startColour = coinData.Colour;
    element.addEventListener('change', addCrypto);

    text.setAttribute('for', coinData.Name);
    text.innerHTML = coinData.Name;

    colour.className = "jscolor {onFineChange:'updatePreviewColour(this)',valueElement:null,value:'"+ coinData.Colour +"'}";
    colour.style.width = '20';
    colour.style.height = '20';
    colour.id = coinData.Ticker + '-colour';

    colourSVG.className = "jscolor {onFineChange:'updatePreviewSVGColour(this)',valueElement:null,value:'000000'}";
    colourSVG.style.width = '20';
    colourSVG.style.height = '20';
    colourSVG.id = coinData.Ticker + '-svg-colour';

    icon.className = 'touchbar-crypto-icon';
    icon.setAttribute('src', coinData.Icon);
    icon.style.width = '22';
    icon.style.height = '22';

    cryptoSelector.appendChild(element);
    cryptoSelector.appendChild(icon);
    cryptoSelector.appendChild(text);
    cryptoSelector.appendChild(colour);
    cryptoSelector.appendChild(colourSVG);
    document.getElementById('coins').appendChild(cryptoSelector);

    // Initialise jscolor on new element
    jscolor.installByClassName('jscolor');

}

function removeCustomCoin(event) {
    const targetValue = event.value,
        cryptoTouch = document.getElementById(targetValue + '-touch'),
        cryptoSelect = document.getElementById(targetValue + '-colour');
    if (cryptoTouch) cryptoTouch.parentNode.removeChild(cryptoTouch);
    if (cryptoSelect) {
        var div = cryptoSelect.parentNode;
        div.parentNode.removeChild(div);
    }
}

function loadData() {

    var dynCoinArr = [];

    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'https://min-api.cryptocompare.com/data/all/coinlist');
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
      if (xhr.status === 200) {
        var jsonData = JSON.parse(xhr.responseText);
  
        var count = 0;
        var input = jsonData.Data;

        for ( property in  input) {
            if(input.hasOwnProperty(property)) {
            var customProperties = {
                "icon": 'img/TODO.svg',
                "color": '6CAAE5'
            };
            var showTopX = false;
            var customData = getSelectedValue(new coinJSON(), 'Ticker', input[property].Symbol)[0];
            if (customData) {
                if (customData.ShowDefault) showTopX = true;
                customProperties = {
                    "icon": 'node_modules/cryptocoins-icons/SVG/' + customData.Icon + '.svg',
                    "color": customData.Colour
                }
            }
            dynCoinArr.push({
                "value" : input[property].Symbol,
                "label" : input[property].CoinName,
                "customProperties" : customProperties,
                "selected" : showTopX
            });
            count++;
           }
        }

        var genericExamples = new Choices('#dynamic-coinlist', {
            placeholderValue: 'Search for a CryptoCurrency ('+count+') supported',
            searchPlaceholderValue: 'Search for a CryptoCurrency ('+count+') supported',
            noResultsText: 'Search returned no results',
            choices: dynCoinArr,
            searchResultLimit: 15,
            shouldSort: true,
            searchFields: ['label', 'value'],
            searchEnabled: true,
            searchChoices: true,
            addItems: true,
            duplicateItems: false,
            removeItemButton: true
          });
      }
      else {
        console.log('Request failed.  Returned status of ' + xhr.status);
      }
    };
    xhr.send();

    const dropdown = document.getElementById('fiat'),
        slider = document.getElementById('refreshSlider'),
        output = document.getElementById('refreshInterval');

    dropdown.addEventListener('change', updatePreviewFiat);

    new fiatJSON().forEach((currency) => {
        let option = document.createElement('option');
        option.value = currency.ticker;
        option.innerHTML = currency.name;
        dropdown.appendChild(option);
    });

    // enable colour picker on dynamically generated inputs
    jscolor.installByClassName('jscolor');

    // enable flatpickr
    let flatpickrOutput = document.getElementById('flatpicker-output'),
    flatpickerOutputString = document.getElementById('flatpicker-output-string');
    
    let datetimepicker = flatpickr("#flatpickr", {
        enableTime: true,
        dateFormat: 'm/d/Y at h:i K',
        onChange: dates => {
            flatpickrOutput.value = dates[0].getTime()/1000;
            flatpickerOutputString.value = datetimepicker.formatDate(dates[0], 'm/d/Y at h:i K');
        }
    });
    let minutePicker = document.getElementsByClassName('flatpickr-minute')[0];
    minutePicker.setAttribute('step', '0');
    minutePicker.setAttribute('max', '0');
    minutePicker.setAttribute('min', '0');
    
    // set up slider for refresh value
    output.innerHTML = slider.value;
    slider.addEventListener('input', (inputEvent) => {
        output.innerHTML = event.target.value;
    });

    // events for on change of searchbox input
    var dynamicCoinList = document.getElementById('dynamic-coinlist');
    dynamicCoinList.addEventListener('addItem', function(event) {
        let customCoin = {
            "Colour" : event.detail.customProperties.color,
            "Name" : event.detail.label,
            "Ticker" : event.detail.value,
            "Icon" : event.detail.customProperties.icon
        };
        addCoin(customCoin);
    });
    
    dynamicCoinList.addEventListener('removeItem', function(event) {
        removeCustomCoin(event.detail);
    });

    // event for historical price selection - force enable group
    var groupSelect = document.getElementById('groupcheckbox');
    var datePicker = document.getElementById('flatpickr');
    var historicalRadio = document.getElementById('historical-price');
    var liveRadio = document.getElementById('live-price');

    historicalRadio.addEventListener('change', function(event) {
        groupSelect.checked = true;
        groupSelect.disabled = true;
        datePicker.style.display = 'block';
        
        var ele = document.getElementsByName("variance-type");
        for(var i=0;i<ele.length;i++) {
           ele[i].checked = false;
           ele[i].disabled = true;
        }
        document.getElementById('no-trend').checked = true;

    });
   
    liveRadio.addEventListener('change', function(event) {
        groupSelect.checked = false;
        groupSelect.disabled = false;
        datePicker.style.display = 'none';

        var ele = document.getElementsByName("variance-type");
        for(var i=0;i<ele.length;i++) {
           ele[i].disabled = false;
        }
    });    
}
