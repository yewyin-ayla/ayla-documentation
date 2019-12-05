/*------------------------------------------------------
On Click button-run
------------------------------------------------------*/

$(function() {
  $("#core-content").delegate("div.api div.content button.run", "click", function(event) {
    let api = $(this).closest('div.api')
    let regionId = $("select.ayla-regions option:selected").val()
    let server = serviceUrls[regionId][$(api).data('service')]
    let method = $(api).find('div.header div.method').text()
    let url = formatUrl(api)
    let accessToken = $('#ayla-account-access-token').val()
    let refreshToken = $('#ayla-account-refresh-token').val()
    let requestData = ''
    let requestElement = $(api).find('pre.request-data-element')
    if(requestElement.length) {
      requestData = $(requestElement).text()
    }
    let responseElement = $(api).find('pre.response-data-element')
    let statusCodes = $(api).find('div.status-codes')
    runApi(method, server, url, accessToken, refreshToken, requestData, responseElement, statusCodes)
  })
})

/*------------------------------------------------------
runApi
------------------------------------------------------*/

function runApi(method, server, url, accessToken, refreshToken, requestData, responseElement, statusCodes) {
  axios({
    method: method,
    url: server + url,
    headers: {
      'Authorization': 'auth_token ' + accessToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    data: requestData
  })
  .then(function(response) {
    $(responseElement).text(JSON.stringify(response, null, 2))
    setStatus(statusCodes, response.status)
  })
  .catch(function(error) {

    if(error.response.status == '401') {
      let regions = getRegions()
      let account = getCurrentAccount(regions)
      let responseBody = error.response

      if(refreshToken) {
        AYLA.postUsersRefreshToken(server, refreshToken, function(response) {
          $('#ayla-account-access-token').val(response.data.access_token)
          $('#ayla-account-refresh-token').val(response.data.refresh_token)
          account.access_token = response.data.access_token
          account.refresh_token = response.data.refresh_token
          setRegions(regions)
          setAuthUserFields(account)
          runApi(method, server, url, account.access_token, null, requestData, responseElement, statusCodes)
      
        }, function(error) {
          account.access_token = ''
          account.refresh_token = ''
          setRegions(regions)
          displayTokenState()
          let s = JSON.stringify(responseBody, null, 2)
          let t = JSON.stringify(error, null, 2)
          $(responseElement).text(s + '\n'  + t)
          setStatus(statusCodes, responseBody.status)
        })
      } else {
        account.access_token = ''
        account.refresh_token = ''
        setRegions(regions)
        displayTokenState()
        $(responseElement).text(JSON.stringify(responseBody, null, 2))
        setStatus(statusCodes, responseBody.status)
      }

    } else {
      $(responseElement).text(JSON.stringify(error.response, null, 2))
      setStatus(statusCodes, error.response.status)
    }
  })
}

/*------------------------------------------------------
runApi
------------------------------------------------------*/

function process401() {
  Console.log('Processing 401')
}

/*------------------------------------------------------
formatUrl
------------------------------------------------------*/

function formatUrl(api) {
  var url = $(api).find('div.header div.url').text()

  let pathParameters = $(api).find('div.path-parameter input.value')
  if(pathParameters.length) {
    let re = /\{[a-z|A-Z]+\}/g;
    let urlParts = url.split(re).filter(Boolean)
    let i = 0
    url = ''
    for(; i < pathParameters.length; i++) { 
      url = url + urlParts[i] + $(pathParameters.eq(i)).val()
    }
    if((i+1) == urlParts.length) {
      url = url + urlParts[i]
    }
  }

  let queryParameters = $(api).find('div.query-parameter input.value')
  if(queryParameters.length) {
    url = url + '?'
    let count = 0
    for(let i = 0; i < queryParameters.length; i++) {
      let key = $(queryParameters.eq(i)).attr('placeholder')
      let value = $(queryParameters.eq(i)).val()
      if(value) {
        if(count > 0) {url = url + '&'}
        url = url + key + '=' + value.replace(/ /g, '%20')
        count++
      }
    }
  }

  return url
}

/*------------------------------------------------------
setStatus
------------------------------------------------------*/

function setStatus(statusCodes, status) {
  clearStatus(statusCodes)
  let statusCode = $(statusCodes).children('div.status-code.sc' + status)
  $(statusCode).children('div.code').css('background', 'black').css('color', 'white')
}

/*------------------------------------------------------
clearStatus
------------------------------------------------------*/

function clearStatus(statusCodes) {
  $(statusCodes).find('div.code').css('background', 'transparent').css('color', '#212529')
}

/*------------------------------------------------------
Toggle Request Data Element Visibility
------------------------------------------------------*/

$(function() {
  $("#core-content").delegate("div.api button.toggle-request-data-element", "click", function(event) {
    let content = $(this).closest('div.content')
    let el = $(content).find('pre.request-data-element')
    if($(el).is(':visible')) {
      $(el).hide()
      $(this).text('Show')
    } else {
      $(el).show()
      $(this).text('Hide')
    }    
  })
})

/*------------------------------------------------------
Toggle Response Data Element Visibility
------------------------------------------------------*/

$(function() {
  $("#core-content").delegate("div.api button.toggle-response-data-element", "click", function(event) {
    let content = $(this).closest('div.content')
    let el = $(content).find('pre.response-data-element')
    if($(el).is(':visible')) {
      $(el).hide()
      $(this).text('Show')
    } else {
      $(el).show()
      $(this).text('Hide')
    }    
  })
})

/*------------------------------------------------------
Clear Response Element
------------------------------------------------------*/

$(function() {
  $("#core-content").delegate("div.api div.content button.clear", "click", function(event) {
    let content = $(this).closest('div.content')
    $(content).find('pre.response-data-element').empty()
    clearStatus($(content).find('div.status-codes'))
  })
})

/*------------------------------------------------------
Local Storage
------------------------------------------------------*/

function getRegions() {
  let str = localStorage.getItem('regions')
  if(str) {
    return JSON.parse(str)
  } else {
    let regions = {}
    regions.cndev = []
    regions.cnfield = []
    regions.eufield = []
    regions.usdev = []
    regions.usfield = []
    return regions
  }
}

function setRegions(regions) {localStorage.setItem('regions', JSON.stringify(regions))}

function deleteRegions() {localStorage.removeItem('regions')}

function getCurrentAccount(regions) {
  let regionId = $("select.ayla-regions option:selected").val()
  let region = regions[regionId]
  let accountId = $("select.ayla-accounts option:selected").val()
  if(accountId) {
    for(let i = 0; i < region.length; i++) { 
      if(region[i].uuid == accountId) {
        return region[i]
      }
    }
  }
  let account = {}
  account.account_name = ''
  account.email = ''
  account.password = ''
  account.app_id = ''
  account.app_secret = ''
  account.access_token = ''
  account.refresh_token = ''
  account.uuid = ''
  account.user_id = ''
  return account
}

/*------------------------------------------------------
setTokenState
------------------------------------------------------*/

function setTokenState(accessToken='', refreshToken='') {
  let regions = getRegions()
  let account = getCurrentAccount(regions)
  account.access_token = accessToken
  account.refresh_token = refreshToken
  setRegions(regions)
}

/*------------------------------------------------------
displayTokenState
------------------------------------------------------*/

function displayTokenState(account=null) {
  if(account) {
    $('#ayla-account-access-token').val(account.access_token)
    $('#ayla-account-refresh-token').val(account.refresh_token)
    $('#ayla-account-tokens-btn').text('Return Tokens')
    $('#ayla-account-tokens-btn').removeClass('btn-success').addClass('btn-warning')
    setAuthUserFields(account)
    populateDevices()
  } else {
    $('#ayla-account-access-token').val('')
    $('#ayla-account-refresh-token').val('')
    $('#ayla-account-tokens-btn').text('Get Tokens')
    $('#ayla-account-tokens-btn').removeClass('btn-warning').addClass('btn-success')
    setAuthUserFields()
    clearDevicesPropertiesValue()
  }
}

/*------------------------------------------------------
Create new account with tokens or get/return tokens
------------------------------------------------------*/

$(function() {
  $('#ayla-account-tokens-btn').click(function(event) {
    let regions = getRegions()
    let regionId = $("select.ayla-regions option:selected").val()
    let accountId = $("select.ayla-accounts option:selected").val()
    let server = serviceUrls[regionId]['user']
    let account = {}
    if(accountId != 'add') {account = getCurrentAccount(regions)}

    // Return tokens.
    if(account.access_token) {
      let user = {}
      user.access_token = account.access_token
      let data = {}
      data.user = user
      AYLA.postUsersSignOut(server, data, function(response) {
        account.access_token = ''
        account.refresh_token = ''
        setRegions(regions)
        displayTokenState()
      }, function(error) {
        console.log(JSON.stringify(error, null, 2))
      })

    // Get tokens.
    } else {
      account.email = $('#ayla-account-email').val()
      account.password = $('#ayla-account-password').val()
      let aid = $('#ayla-account-app-id').val()
      if(aid) {account.app_id = aid}
      else {account.app_id = 'alya-api-browser-id'}
      let asecret = $('#ayla-account-app-secret').val()
      if(asecret) {account.app_secret = asecret}
      else {account.app_secret = 'alya-api-browser-2tFsUL41FELUlyfrSMEZ4kNKwJg'}
      let application = {}
      application.app_id = account.app_id
      application.app_secret = account.app_secret
      let user = {}
      user.email = account.email
      user.password = account.password
      user.application = application
      let data = {}
      data.user = user

      AYLA.postUsersSignIn(server, data, function(response) {

        // Account already exists in local storage.
        account.access_token = response.data.access_token
        account.refresh_token = response.data.refresh_token
        if(accountId != 'add') {
          setRegions(regions)
          displayTokenState(account)
          return
        }

        // Account does not already exist in local storage.
        AYLA.getUsersGetUserProfile(server, account.access_token, function(response) {
          account.uuid = response.data.uuid

          AYLA.getUsersUuid(server, account.access_token, account.uuid, function(response) {
            account.user_id = response.data.id
            account.account_name = response.data.origin_oem_name
            regions[regionId].push(account)
            let option = $('<option/>')
            option.text(account.account_name)
            option.val(account.uuid)
            $("select.ayla-accounts option[value='add']").remove()
            $('select.ayla-accounts').append(option)
            $(option).prop('selected', true)
            $('#ayla-account-uuid').val(account.uuid)
            $('#ayla-account-user-id').val(account.user_id)
            setRegions(regions)
            setUserFields(account)
            displayTokenState(account)
          }, function(error) {
            console.log(JSON.stringify(error, null, 2))
          })
        }, function(error) {
          console.log(JSON.stringify(error, null, 2))
        })
      }, function(error) {
        console.log(JSON.stringify(error, null, 2))
      })
    }
  })
})

/*------------------------------------------------------
Add Account
------------------------------------------------------*/

$(function() {
  $('#ayla-add-account-btn').click(function(event) {
    if($("select.ayla-accounts option:selected").val() != 'add') {
      addAddAccountOption()
    }
  })
})

/*------------------------------------------------------
Add Add Account Option
------------------------------------------------------*/

function addAddAccountOption() {
  var option = $('<option/>')
  option.text('')
  option.val('add')
  $('select.ayla-accounts').append(option)
  $(option).prop('selected', true)
  $(option).hide()
  fillAccountForm()
}

/*------------------------------------------------------
Remove Add Account Option
------------------------------------------------------*/

function removeAddAccountOption() {
  $("select.ayla-accounts option[value='add']").remove()
}

/*------------------------------------------------------
Remove Account
------------------------------------------------------*/

$(function() {
  $('#ayla-remove-account-btn').click(function(event) {
    let regions = getRegions()
    let regionId = $("select.ayla-regions option:selected").val()
    let region = regions[regionId]
    let accountId = $("select.ayla-accounts option:selected").val()
    let i = 0
    for(; i < region.length; i++) { 
      if(region[i].uuid == accountId) {
        break;
      }
    }
    region.splice(i, 1)
    setRegions(regions)
    $("select.ayla-accounts option:selected").remove()
    if($("select.ayla-accounts option:selected").val()) {
      let account = getCurrentAccount(getRegions())
      fillAccountForm(account)  
    } else {
      fillAccountForm()
    }
  })
})

/*------------------------------------------------------
Region/Service/URL array
------------------------------------------------------*/

var serviceUrls = new Array()
serviceUrls['cndev'] = new Array()
serviceUrls['cndev']['application'] = "https://application.ayla.com.cn"
serviceUrls['cndev']['datastream'] = "https://stream.ayla.com.cn"
serviceUrls['cndev']['device'] = "https://ads-dev.ayla.com.cn"
serviceUrls['cndev']['factory-proxy'] = "https://api-dev.ayla.com.cn"
serviceUrls['cndev']['image'] = "https://ais.ayla.com.cn"
serviceUrls['cndev']['log'] = "https://log.ayla.com.cn"
serviceUrls['cndev']['notification'] = "https://ans.ayla.com.cn"
serviceUrls['cndev']['rules'] = "https://rulesservice-dev.ayla.com.cn"
serviceUrls['cndev']['user'] = "https://user-dev.ayla.com.cn"
serviceUrls['cndev']['zigbee'] = "https://zigbee.ayla.com.cn"
serviceUrls['cndev']['api-documentation'] = "https://docs.aylanetworks.com"
serviceUrls['cnfield'] = new Array()
serviceUrls['cnfield']['application'] = "https://app-field.ayla.com.cn"
serviceUrls['cnfield']['datastream'] = "https://stream-field.ayla.com.cn"
serviceUrls['cnfield']['device'] = "https://ads-field.ayla.com.cn"
serviceUrls['cnfield']['factory-proxy'] = "https://api-field.ayla.com.cn"
serviceUrls['cnfield']['image'] = "https://ais-field.ayla.com.cn"
serviceUrls['cnfield']['log'] = "https://log-field.ayla.com.cn"
serviceUrls['cnfield']['notification'] = "https://ans-field.ayla.com.cn"
serviceUrls['cnfield']['rules'] = "https://rulesservice-field.ayla.com.cn"
serviceUrls['cnfield']['user'] = "https://user-field.ayla.com.cn"
serviceUrls['cnfield']['zigbee'] = "https://zigbee-field.ayla.com.cn"
serviceUrls['cnfield']['api-documentation'] = "https://docs.aylanetworks.com"
serviceUrls['eufield'] = new Array()
serviceUrls['eufield']['application'] = "https://app-field-eu.aylanetworks.com"
serviceUrls['eufield']['datastream'] = "https://stream-field-eu.aylanetworks.com"
serviceUrls['eufield']['device'] = "https://ads-field-eu.aylanetworks.com"
serviceUrls['eufield']['factory-proxy'] = "https://api-field-eu.aylanetworks.com"
serviceUrls['eufield']['image'] = "https://ais-field-eu.aylanetworks.com"
serviceUrls['eufield']['log'] = "https://log-field-eu.aylanetworks.com"
serviceUrls['eufield']['notification'] = "https://ans-field-eu.aylanetworks.com"
serviceUrls['eufield']['rules'] = "https://rulesservice-field-eu.aylanetworks.com"
serviceUrls['eufield']['user'] = "https://user-field-eu.aylanetworks.com"
serviceUrls['eufield']['zigbee'] = "https://zigbee-field-eu.aylanetworks.com"
serviceUrls['eufield']['api-documentation'] = "https://docs.aylanetworks.com"
serviceUrls['usdev'] = new Array()
serviceUrls['usdev']['application'] = "https://application.aylanetworks.com"
serviceUrls['usdev']['datastream'] = "https://stream.aylanetworks.com"
serviceUrls['usdev']['device'] = "https://ads-dev.aylanetworks.com"
serviceUrls['usdev']['factory-proxy'] = "https://api-dev.aylanetworks.com"
serviceUrls['usdev']['image'] = "https://ais.aylanetworks.com"
serviceUrls['usdev']['log'] = "https://log.aylanetworks.com"
serviceUrls['usdev']['notification'] = "https://ans.aylanetworks.com"
serviceUrls['usdev']['rules'] = "https://rulesservice-dev.aylanetworks.com"
serviceUrls['usdev']['user'] = "https://user-dev.aylanetworks.com"
serviceUrls['usdev']['zigbee'] = "https://zigbee.aylanetworks.com"
serviceUrls['usdev']['api-documentation'] = "https://docs.aylanetworks.com"
serviceUrls['usfield'] = new Array()
serviceUrls['usfield']['application'] = "https://app-field.aylanetworks.com"
serviceUrls['usfield']['datastream'] = "https://stream-field.aylanetworks.com"
serviceUrls['usfield']['device'] = "https://ads-field.aylanetworks.com"
serviceUrls['usfield']['factory-proxy'] = "https://api-field.aylanetworks.com"
serviceUrls['usfield']['image'] = "https://ais-field.aylanetworks.com"
serviceUrls['usfield']['log'] = "https://log-field.aylanetworks.com"
serviceUrls['usfield']['notification'] = "https://ans-field.aylanetworks.com"
serviceUrls['usfield']['rules'] = "https://rulesservice-field.aylanetworks.com"
serviceUrls['usfield']['user'] = "https://user-field.aylanetworks.com"
serviceUrls['usfield']['zigbee'] = "https://zigbee-field.aylanetworks.com"
serviceUrls['usfield']['api-documentation'] = "https://docs.aylanetworks.com"

/*------------------------------------------------------
On Change Region
------------------------------------------------------*/

$(function() {
  $("select.ayla-regions").change(function() {
    writeRegionUrls()
    displayAccounts()
  })
})

/*------------------------------------------------------
writeRegionUrls
------------------------------------------------------*/

function writeRegionUrls() {
  let regionId = $("select.ayla-regions option:selected").val()
  $('#application-service-url').val(serviceUrls[regionId]['application'])
  $('#datastream-service-url').val(serviceUrls[regionId]['datastream'])
  $('#device-service-url').val(serviceUrls[regionId]['device'])
  $('#factory-proxy-service-url').val(serviceUrls[regionId]['factory-proxy'])
  $('#image-service-url').val(serviceUrls[regionId]['image'])
  $('#log-service-url').val(serviceUrls[regionId]['log'])
  $('#notification-service-url').val(serviceUrls[regionId]['notification'])
  $('#rules-service-url').val(serviceUrls[regionId]['rules'])
  $('#user-service-url').val(serviceUrls[regionId]['user'])
  $('#zigbee-service-url').val(serviceUrls[regionId]['zigbee'])
}

/*------------------------------------------------------
displayAccounts
------------------------------------------------------*/

function displayAccounts() {
  let regions = getRegions()
  let regionId = $("select.ayla-regions option:selected").val()
  let region = regions[regionId]
  $('select.ayla-accounts').empty()
  region.forEach(account => {
    var option = $('<option/>')
    option.text(account.account_name)
    option.val(account.uuid)
    $('select.ayla-accounts').append(option)
  })
  if($('select.ayla-accounts option').length) {
    fillAccountForm(region[0])
  } else {
    addAddAccountOption()
    fillAccountForm()
  }
}

/*------------------------------------------------------
On Change Account
------------------------------------------------------*/

$(function() {
  $("select.ayla-accounts").change(function() {
    removeAddAccountOption()
    let account = getCurrentAccount(getRegions())
    fillAccountForm(account)
  })
})

/*------------------------------------------------------
fillAccountForm
------------------------------------------------------*/

function fillAccountForm(account=null) {
  if(account) {
    $('#ayla-account-email').val(account.email)
    $('#ayla-account-password').val(account.password)
    $('#ayla-account-app-id').val(account.app_id)
    $('#ayla-account-app-secret').val(account.app_secret)
    $('#ayla-account-uuid').val(account.uuid)
    $('#ayla-account-user-id').val(account.user_id)
    setUserFields(account)
    if(account.access_token) {displayTokenState(account)}
    else {displayTokenState()}
  } else {
    $('#ayla-account-email').val('')
    $('#ayla-account-password').val('')
    $('#ayla-account-app-id').val('')
    $('#ayla-account-app-secret').val('')
    $('#ayla-account-user-id').val('')
    $('#ayla-account-uuid').val('')
    setUserFields()
    displayTokenState()  
  }
}

/*------------------------------------------------------
setUserFields
------------------------------------------------------*/

function setUserFields(account=null) {
  if(account) {
    let emailSpans = $('pre.request-data-element span.email')
    for(let i=0; i < emailSpans.length; i++) { 
      $(emailSpans.eq(i)).text(account.email)
    }
    let appIdSpans = $('pre.request-data-element span.app-id')
    for(let i=0; i < appIdSpans.length; i++) { 
      $(appIdSpans.eq(i)).text(account.app_id)
    }
    let appSecretSpans = $('pre.request-data-element span.app-secret')
    for(let i=0; i < appSecretSpans.length; i++) { 
      $(appSecretSpans.eq(i)).text(account.app_secret)
    }  
  } else {
    let emailSpans = $('pre.request-data-element span.email')
    for(let i=0; i < emailSpans.length; i++) { 
      $(emailSpans.eq(i)).text('')
    }
    let appIdSpans = $('pre.request-data-element span.app-id')
    for(let i=0; i < appIdSpans.length; i++) { 
      $(appIdSpans.eq(i)).text('')
    }
    let appSecretSpans = $('pre.request-data-element span.app-secret')
    for(let i=0; i < appSecretSpans.length; i++) { 
      $(appSecretSpans.eq(i)).text('')
    }  
  }
}

/*------------------------------------------------------
setAuthUserFields
------------------------------------------------------*/

function setAuthUserFields(account=null) {
  if(account) {
    let uuidInputs = $('div.path-parameter input[placeholder = "uuid"]')
    for(let i=0; i < uuidInputs.length; i++) { 
      $(uuidInputs.eq(i)).val(account.uuid)
    }
    let accessTokenSpans = $('pre.request-data-element span.access-token')
    for(let i=0; i < accessTokenSpans.length; i++) { 
      $(accessTokenSpans.eq(i)).text(account.access_token)
    }
    let refreshTokenSpans = $('pre.request-data-element span.refresh-token')
    for(let i=0; i < refreshTokenSpans.length; i++) { 
      $(refreshTokenSpans.eq(i)).text(account.refresh_token)
    }
  } else {
    let uuidInputs = $('div.path-parameter input[placeholder = "uuid"]')
    for(let i=0; i < uuidInputs.length; i++) { 
      $(uuidInputs.eq(i)).val('')
    }
    let accessTokenSpans = $('pre.request-data-element span.access-token')
    for(let i=0; i < accessTokenSpans.length; i++) { 
      $(accessTokenSpans.eq(i)).text('')
    }  
    let refreshTokenSpans = $('pre.request-data-element span.refresh-token')
    for(let i=0; i < refreshTokenSpans.length; i++) { 
      $(refreshTokenSpans.eq(i)).text('')
    }
  }
}

/*------------------------------------------------------
setDeviceFields
------------------------------------------------------*/

function setDeviceFields(device=null) {
  if(device) {
    let devIdInputs = $('div.path-parameter input[placeholder = "devId"]')
    for(let i=0; i < devIdInputs.length; i++) { 
      $(devIdInputs.eq(i)).val(device.key)
    }
    let dsnInputs = $('div.path-parameter input[placeholder = "dsn"]')
    for(let i=0; i < dsnInputs.length; i++) { 
      $(dsnInputs.eq(i)).val(device.dsn)
    }
    let devIdSpans = $('pre.request-data-element span.dev-id')
    for(let i=0; i < devIdSpans.length; i++) { 
      $(devIdSpans.eq(i)).text(device.key)
    }
    let dsnSpans = $('pre.request-data-element span.dsn')
    for(let i=0; i < dsnSpans.length; i++) { 
      $(dsnSpans.eq(i)).text(device.dsn)
    }  
  } else {
    let devIdInputs = $('div.path-parameter input[placeholder = "devId"]')
    for(let i=0; i < devIdInputs.length; i++) { 
      $(devIdInputs.eq(i)).val('')
    }
    let dsnInputs = $('div.path-parameter input[placeholder = "dsn"]')
    for(let i=0; i < dsnInputs.length; i++) { 
      $(dsnInputs.eq(i)).val('')
    }
    let devIdSpans = $('pre.request-data-element span.dev-id')
    for(let i=0; i < devIdSpans.length; i++) { 
      $(devIdSpans.eq(i)).text('')
    }
    let dsnSpans = $('pre.request-data-element span.dsn')
    for(let i=0; i < dsnSpans.length; i++) { 
      $(dsnSpans.eq(i)).text('')
    }  
  }
}

/*------------------------------------------------------
setPropertyFields
------------------------------------------------------*/

function setPropertyFields(property=null) {
  if(property) {
    let propNameInputs = $('div.path-parameter input[placeholder = "propName"]')
    for(let i=0; i < propNameInputs.length; i++) { 
      $(propNameInputs.eq(i)).val(property.name)
    }
    let propNameSpans = $('pre.request-data-element span.prop-name')
    for(let i=0; i < propNameSpans.length; i++) { 
      $(propNameSpans.eq(i)).text(property.name)
    }
  } else {
    let propNameInputs = $('div.path-parameter input[placeholder = "propName"]')
    for(let i=0; i < propNameInputs.length; i++) { 
      $(propNameInputs.eq(i)).val('')
    }
    let propNameSpans = $('pre.request-data-element span.prop-name')
    for(let i=0; i < propNameSpans.length; i++) { 
      $(propNameSpans.eq(i)).text('')
    }
  }
}

/*------------------------------------------------------
Functions related to collapse or toggling state
------------------------------------------------------*/

$(function() {
  $('#ayla-region-urls').on('show.bs.collapse', function() {
    $('#ayla-account-details').collapse('hide')
  })
})

$(function() {
  $('#ayla-account-details').on('show.bs.collapse', function() {
    $('#ayla-region-urls').collapse('hide')
  })
})

$(function() {
  $('#dt-device-details').on('show.bs.collapse', function() {
    $('#dt-property-details').collapse('hide')
  })
})

$(function() {
  $('#dt-property-details').on('show.bs.collapse', function() {
    $('#dt-device-details').collapse('hide')
  })
})

$(function () {
  $("#directions-button").click(function (event) {
    $('#directions-section').toggle()
  })
})

$(function () {
  $("#accounts-button").click(function (event) {
    $('#accounts-section').toggle()
  })
})

$(function () {
  $("#devices-button").click(function (event) {
    $('#devices-section').toggle()
  })
})

$(function () {
  $("#filter-button").click(function (event) {
    $('#filter-section').toggle()
  })
})

$(function () {
  $("#stats-button").click(function (event) {
    $('#stats-section').toggle()
  })
})

/*------------------------------------------------------
clearDevicesPropertiesValue
------------------------------------------------------*/

function clearDevicesPropertiesValue() {
  removeDevices()
  removeProperties()
  removeValue()
}

/*------------------------------------------------------
populateDevices
------------------------------------------------------*/

function populateDevices() {
  let regionId = $("select.ayla-regions option:selected").val()
  let server = serviceUrls[regionId]['device']
  let accessToken = $('#ayla-account-access-token').val()
  AYLA.getApiv1Devices(server, accessToken, function(response) {
    removeDevices()
    if(response.data.length) {
      addDevices(response.data)
      populateDevice(response.data[0].device.key)
    }
  }, function(response) {
    console.log(JSON.stringify(response, null, 2))
  })
}

/*------------------------------------------------------
addDevices
------------------------------------------------------*/

function addDevices(devices) {
  devices.forEach(function(data) {
    addDevice(data.device)
  })
}

/*------------------------------------------------------
addDevice
------------------------------------------------------*/

function addDevice(device) {
  var option = $('<option/>')
  option.text(device.product_name)
  option.val(device.key)
  $('#dt-device-selector').append(option)
}

/*------------------------------------------------------
removeDevices
------------------------------------------------------*/

function removeDevices() {
  $('#dt-device-selector').empty()
  $('#dt-device-details').text('')
  setDeviceFields()
}

/*------------------------------------------------------
On Change Device
------------------------------------------------------*/

$(function() {
  $( "#dt-device-selector" ).change(function() {
    let devId = $('#dt-device-selector option:selected').val()
    populateDevice(devId)
  })
})

/*------------------------------------------------------
populateDevice
------------------------------------------------------*/

function populateDevice(devId) {
  let regionId = $("select.ayla-regions option:selected").val()
  let server = serviceUrls[regionId]['device']
  let token = getCurrentAccount(getRegions()).access_token
  AYLA.getApiv1DevicesDevId(server, token, devId, function(response) {
    let option = $('#dt-device-selector option:selected')
    $(option).text(response.data.device.product_name)
    $(option).data('details', response.data.device)
    $('#dt-device-details').text(JSON.stringify(response.data.device, null, 2))
    setDeviceFields(response.data.device)
  }, function(response) {
    console.log(JSON.stringify(response, null, 2))
  })
  populateProperties(devId)
}

/*------------------------------------------------------
populateProperties
------------------------------------------------------*/

function populateProperties(devId) {
  let regionId = $("select.ayla-regions option:selected").val()
  let server = serviceUrls[regionId]['device']
  let token = getCurrentAccount(getRegions()).access_token
  AYLA.getApiv1DevicesDevIdProperties(server, token, devId, function(response) {
    removeProperties()
    if(response.data.length) {
      addProperties(response.data)
      populateProperty(devId, response.data[0].property.name)
    }
  }, function(response) {
    console.log(JSON.stringify(response, null, 2))
  })
}

/*------------------------------------------------------
addProperties
------------------------------------------------------*/

function addProperties(properties) {
  properties.forEach(function(wrapper) {
    addProperty(wrapper.property)
  })
}

/*------------------------------------------------------
addProperty
------------------------------------------------------*/

function addProperty(property) {
  var option = $('<option/>')
  option.text(property.display_name)
  option.val(property.name)
  $('#dt-property-selector').append(option)
}

/*------------------------------------------------------
removeProperties
------------------------------------------------------*/

function removeProperties() {
  $('#dt-property-selector').empty()
  $('#dt-property-details').text('')
  setPropertyFields()
}

/*------------------------------------------------------
On Change Property
------------------------------------------------------*/

$(function() {
  $( "#dt-property-selector" ).change(function() {
    let devId = $('#dt-device-selector option:selected').val()
    let propName = $('#dt-property-selector option:selected').val()
    populateProperty(devId, propName)
  })
})

/*------------------------------------------------------
populateProperty
------------------------------------------------------*/

function populateProperty(devId, propName) {
  let regionId = $("select.ayla-regions option:selected").val()
  let server = serviceUrls[regionId]['device']
  let token = getCurrentAccount(getRegions()).access_token
  AYLA.getApiv1DevicesDevIdPropertiesPropName(server, token, devId, propName, function(response) {
    let option = $('#dt-property-selector option:selected')
    $(option).text(response.data.property.name)
    $(option).data('details', response.data.property)
    $('#dt-property-details').text(JSON.stringify(response.data.property, null, 2))
    displayPropertyValue(
      response.data.property.base_type, 
      response.data.property.value, 
      response.data.property.direction)
      setPropertyFields(response.data.property)
    }, function(response) {
    console.log(JSON.stringify(response, null, 2))
  })
}

/*------------------------------------------------------
displayPropertyValue
------------------------------------------------------*/

function displayPropertyValue(type, value, direction) {
  let status = (direction==='input') ? '>' : ' disabled>'

  switch(type) {
    case 'boolean':
    $('#dt-value-button-wrapper').hide()

    let checked = (value===1) ? ' checked' : ''

    $('#dt-value-wrapper').empty().append(''
      + '<label class="switch" style="margin-bottom:0;">'
      + '<input id="property-value" type="checkbox" value="' + value + '"' + checked + status
      + '<span class="slider round"></span>'
      + '</label>')
    break

    default:
    $('#dt-value-wrapper').empty().append('<input id="property-value" type="text" class="form-control form-control-sm" value="' + value + '"' + status)
    if(direction==='input') {
      $('#dt-value-button-wrapper').show()
    } else {
      $('#dt-value-button-wrapper').hide()
    }
    break
  }
}

/*------------------------------------------------------
On Change Datapoint (for boolean properties)
On Click Datapoint (for non-boolean properties)
------------------------------------------------------*/

$(function() {
  $('#dt-value-wrapper').delegate('input:checkbox', "change", function(event) {
    let regionId = $("select.ayla-regions option:selected").val()
    let server = serviceUrls[regionId]['device']
    let token = getCurrentAccount(getRegions()).access_token
    let devId = $('#dt-device-selector option:selected').val()
    let propName = $('#dt-property-selector option:selected').val()
    let value = $(this).prop('checked') + 0
    let datapoint = {}
    datapoint.value = value
    let requestData = {}
    requestData.datapoint = datapoint
    AYLA.postApiv1DevicesDevIdPropertiesPropertyNameDatapoints(server, token, devId, propName, requestData, function(response) {
      console.log(JSON.stringify(response.data, null, 2))
    }, function(response) {
      console.log(JSON.stringify(response, null, 2))
    })
  })
})

$(function() {
  $('#dt-save-value-btn').click(function(event) {
    let regionId = $("select.ayla-regions option:selected").val()
    let server = serviceUrls[regionId]['device']
    let token = getCurrentAccount(getRegions()).access_token
    let devId = $('#dt-device-selector option:selected').val()
    let propName = $('#dt-property-selector option:selected').val()
    let value = $('#dt-value-wrapper input').val()
    let datapoint = {}
    datapoint.value = value
    let requestData = {}
    requestData.datapoint = datapoint
    AYLA.postApiv1DevicesDevIdPropertiesPropertyNameDatapoints(server, token, devId, propName, requestData, function(response) {
      console.log(JSON.stringify(response.data, null, 2))
    }, function(response) {
      console.log(JSON.stringify(response, null, 2))
    })
  })
})

/*------------------------------------------------------
removeValue
------------------------------------------------------*/

function removeValue() {
  $('#dt-value-wrapper').empty().append('<input type="text" class="form-control form-control-sm" disabled>')
  $('#dt-value-button-wrapper').hide()
}

/*------------------------------------------------------
buildApi
------------------------------------------------------*/

function buildApi(apiElement, api, collapsed=true) {

  let serviceName = api.service.name.toLowerCase().replace(/ /g, "-")

  let collapseId = api.method.name + api.path
  .replace(/\//g, '-')
  .replace(/\./g, '-')
  .replace(/\_/g, '-')
  .replace(/\{/g, '')
  .replace(/\}/g, '')
  .replace(/\:/g, '')
  .toLowerCase()

  let header = $('<div class="header" data-toggle="collapse" href="' + '#' + collapseId + '">')
  if(collapsed) {$(header).addClass('collapsed')}

  header.append(''
    + '<div class="row align-items-center no-gutters">'
    + '<div class="col-12 col-md-auto method">' + api.method.name.toUpperCase() + '</div>'
    + '<div class="col-12 col-md url">' + api.path + '</div>'
    + '<div class="col-12 col-md-auto name">' + api.name + ' (id=' + api.id + ')' + '</div>'
    + '</div>'
  )

  let content = $('<div class="content collapse" id="' + collapseId + '">')
  if(!collapsed) {$(content).addClass('show')}

  content.append(''
    + '<div class="form-row">'
    + '<div class="col description">' + api.description + '</div>'
    + '<div class="col-auto refresh">' + '<img src="/assets/images/refresh.png" width="20" height="16">' + '</div>'
    + '</div>'
  )

  if(api.pathParameters.length || api.queryParameters.length || api.requestData.length) {
    content.append('<div class="heading">Request</div>')
    if(api.requestDescription) {content.append('<div class="request-description">' + api.requestDescription + '</div>')}

    if(api.pathParameters.length) {
      content.append('<div class="subheading">Path Parameters</div>')
      for(let i=0; i < api.pathParameters.length; i++) { 
        content.append(createPathParameter(api.pathParameters[i]))
      }
    }

    if(api.queryParameters.length) {
      content.append('<div class="subheading">Query Parameters</div>')
      for(let i=0; i < api.queryParameters.length; i++) { 
        content.append(createQueryParameter(api.queryParameters[i]))
      }
    }

    if(api.requestData.length) {
      content.append('<div class="subheading">Request Data</div>')
      content.append(''
        + '<div class="btn-group">'
        + '<button type="button" class="btn btn-outline-secondary btn-sm toggle-request-data-element">Hide</button>'
        + '<button type="button" class="btn btn-outline-secondary btn-sm">Reset</button>'
        + '</div>'
        //+ '<pre class="request-data-element" contenteditable="true">' + JSON.stringify(api.requestData, null, 2) + '</pre>'
        + '<pre class="request-data-element" contenteditable="true">' + JSON.stringify(JSON.parse(api.requestData), null, 2) + '</pre>'
      )
    }
  }

  content.append(''
    + '<div class="form-row">'
    + '<div class="col-12">'
    + '<button type="button" class="btn btn-danger btn-sm run">Run</button>'
    + '</div>'
    + '</div>'
  )

  content.append('<div class="heading">Response</div>')
  if(api.responseDescription) {content.append('<div class="response-description">' + api.responseDescription + '</div>')}

  content.append('<div class="subheading">Response Data</div>')
  content.append(''
    + '<div class="btn-group">'
    + '<button type="button" class="btn btn-outline-secondary btn-sm toggle-response-data-element">Show</button>'
    + '<button type="button" class="btn btn-outline-secondary btn-sm clear">Clear</button>'
    + '</div>'
    + '<pre class="response-data-element" style="display:none;"></pre>'
  )

  if(api.statusCodes) {
    content.append('<div class="subheading">Status Codes</div>')
    let sc = $('<div class="status-codes">')
    for(let i=0; i < api.statusCodes.length; i++) {
      sc.append(createStatusCode(api.statusCodes[i]))
    }
    content.append(sc)
  }

  $(apiElement).empty()
  $(apiElement).removeClass()
  $(apiElement).addClass('api')
  $(apiElement).addClass(api.method.name)
  $(apiElement).data('id', api.id)
  $(apiElement).data('service', serviceName)
  apiElement.append(header)
  apiElement.append(content)
  return apiElement
}

/*------------------------------------------------------
renderApi
------------------------------------------------------*/

function renderApi(api) {

  let apiElement = $('<div/>')
  buildApi(apiElement, api)
  let serviceName = api.service.name.toLowerCase().replace(/ /g, "-")
  let serviceContentElement = $('#' + serviceName + '-service-content')
  $(serviceContentElement).append(apiElement)
  let serviceHeaderElement = $('#' + serviceName + '-service-header')
  let counter = $(serviceHeaderElement).find('input.count')
  $(counter).val(parseInt($(counter).val()) + 1)
}

/*------------------------------------------------------
Refresh API
------------------------------------------------------*/

$(function() {
  $("#core-content").delegate("div.api div.content div.refresh img", "click", function(event) {
    let apiElement = $(this).closest('div.api')
    let apiId = $(apiElement).data('id')
    DOCS.getApi(apiId, function (response) {
      console.log(JSON.stringify(response.data, null, 2))
      buildApi(apiElement, response.data, false)
    }, function (error) {
      console.log(JSON.stringify(error, null, 2))
    })    
  })
})

/*------------------------------------------------------
createPathParameter
------------------------------------------------------*/

function createPathParameter(pathParameter) {
  return ''
  + '<div class="form-row path-parameter">'
  + '<div class="col-12 col-lg-3">'
  + '<input type="text" class="form-control form-control-sm value" placeholder="' + pathParameter.name + '">'
  + '</div>'
  + '<div class="col-12 col-lg-9">'
  + '<div>'
  + '<span class="name">' + pathParameter.name + '</span>. '
  + '<span  class="text">' + (pathParameter.customText ? pathParameter.customText : pathParameter.baseText) + '</span></div>'
  + '</div>'
  + '</div>'
}

/*------------------------------------------------------
createQueryParameter
------------------------------------------------------*/

function createQueryParameter(queryParameter) {
  return ''
  + '<div class="form-row query-parameter">'
  + '<div class="col-12 col-lg-3">'
  + '<input type="text" class="form-control form-control-sm value" placeholder="' + queryParameter.name + '">'
  + '</div>'
  + '<div class="col-12 col-lg-9">'
  + '<div>'
  + '<span class="name">' + queryParameter.name + '</span>. '
  + '<span  class="text">' + (queryParameter.customText ? queryParameter.customText : queryParameter.baseText) + '</span></div>'
  + '</div>'
  + '</div>'
}

/*------------------------------------------------------
createStatusCode
------------------------------------------------------*/

function createStatusCode(sc) {
  return ''
  + '<div class="form-row status-code sc' + sc.code + '">'
  + '<div class="col-1 code">' + sc.code + '</div>'
  + '<div class="col-11 text">' + (sc.customText ? sc.customText : sc.baseText) + '</div>'
  + '</div>'
}

/*------------------------------------------------------
renderServices
------------------------------------------------------*/
/*
function renderServices() {
  DOCS.getServices(function(response) {
    let services = response.data
    let servicesElement = $('#ayla-services')
    for(let i=0; i < services.length; i++) {
      let hyphenName = services[i].name.toLowerCase().replace(/ /g, "-")
      let header = $('<h1 id="' + hyphenName + '-service-header" class="api-service"></h1>')
      $(header).append(''
        + '<div class="api-service" data-toggle="collapse" href="#' + hyphenName + '-content">'
        + '<div class="row">'
        + '<div class="col-sm"><div class="name">' + services[i].name + ' Service</div></div>'
        + '<div class="col-auto"><input type="text" class="count" value=0 disabled></div>'
        + '</div>'
        + '</div>'
      )
      let content = '<div class="collapse" id="' + hyphenName + '-content"></div>'
      $(servicesElement).append(header)
      $(servicesElement).append(content)
    }
  }, function(error) {
    console.log(error)
  })
}
*/
/*------------------------------------------------------
On Load
------------------------------------------------------*/

$(function() {
  //renderServices()
  DOCS.getApis(function(response) {
    for(let i = 0; i < response.data.length; i++) {
      renderApi(response.data[i])
    }
    writeRegionUrls()
    displayAccounts()
  }, function(error) {
    console.log(error)
  })
})

/*------------------------------------------------------
Testing Mouseover Fields
------------------------------------------------------*/

$(function() {
  $('#core-content').delegate('pre div.field', 'mouseover', function(event) {
    let name = $(this).data('field-name')
    let text = $(this).children('span')
    DOCS.getFieldByName(name, function(response) {
      $(text).html(response.data)
    }, function(error) {console.log(error)})
  })

  $('#core-content').delegate('pre div.field', 'mouseout', function(event) {
    let text = $(this).children('span')
    $(text).html('')
  })
})