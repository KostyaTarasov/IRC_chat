(function() {
	
	let submit = document.getElementById('submit');
	submit.onclick = function() {
		let nickname = document.getElementById('nickname').value;
		setCookie('nick_connect', nickname, 10000000);
		setCookie('nspasswd', JSON.stringify([ nickname, document.getElementById('nickserv').value ]), 10000000);
		
		document.location.href = 'irc.html?nickname=' + nickname;
	}
	
	let nick_url = getParameterByName('nick');
	
	if (nick_url !== null) {
		document.getElementById('nickname').value = nick_url;
	}
	else {
		
		let nick_connect = getCookie('nick_connect');
		
		if (nick_connect !== '') {
			document.getElementById('nickname').value = nick_connect;
		}
	}
	
	let nspasswd = JSON.parse(getCookie('nspasswd'));
	
	if (nspasswd !== '') {
		document.getElementById('nickserv').value = nspasswd[1];
	}
	
})();




function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return results[2].replace(/\+/g, " ");
}
