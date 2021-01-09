let irc_server_address = 'wss://irc.unrealircd.org:443/';
let urlify_check = true;
//Правая кнопка
let submit = document.getElementById('submit2');
submit.onclick = function() 
{
	document.location.href = '../index.html?';
}

let nickname = getParameterByName('../index.html?');
if (nickname === null) {
	
	nickname = getCookie('nick_connect');
}

if (nickname === '') {
	nickname = 'NewUser_' + Date.now();//Задание уникального имени с помощью метода Date.now() (Кол. миллисек. с 1970 года)
}
	
let nspasswd = getCookie('nspasswd');
if (nspasswd !== '') {	
	nspasswd = JSON.parse(nspasswd);
}

let chans_from_url = getParameterByName('channels');
let nicks_join = new Object();
let topicByCommand = false;
let autojoins_check = false;
let url_summary = true;
let logs = localStorage;
let hl_style;

let activeChannel,active,activeType,activeQuery,ACStriped,status = true,output,websocket,me,myhost,uls = {},uls_no_mode = {},list = {},idmsg = -1,aj = false;

function init() {
	output = document.getElementById('status');
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
    return '';
}

function ignores_check(mask, type) {	
	return true;	
}

function escapeHtml(str) {
    let div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function ht(msg) {
	msg = msg.split(' ');
	let chanht = [];
	msg.forEach(function(word, index) {	
		if (word[0] === '#') {	
			if (word.substr(-1, 1) === '.') {		
				word = word.substr(0, word.length - 1);
			}	
			let chansp = word.substring(1);
			chanht.push( 'ht_' + chansp );
			msg[index] = '<span id="ht_' + chansp + '" class="hashtag">' + word + '</span>'
		}
	});	
	return [ chanht, msg.join(' ') ];
}

function getParameterByName(name, url) {	
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function connectWebSocket() {
	websocket = new WebSocket(irc_server_address);
	websocket.binaryType = 'arraybuffer';
	websocket.onopen = function(evt) { onOpen(evt) };
	websocket.onclose = function(evt) { onClose(evt) };
	websocket.onmessage = function(evt) { onMessage(evt) };
	websocket.onerror = function(evt) { onError(evt) };
}

function onOpen(evt) {
	doSend('user NewUser * * :NewUser user - ');
	doSend('nick ' + nickname);
}

function onClose(evt) {
	writeToScreen('DISCONNECTED');
}

function onMessage(evt) {
	let rawData = evt.data;
	if (rawData instanceof Blob) {
		let fileReader = new FileReader();
		fileReader.addEventListener('loadend', handleBinaryInput);
		fileReader.readAsText(rawData);
	}
	else {
		process(rawData);
	}
}

function handleBinaryInput(event) {
	let fileReader = event.target;
	let raw = fileReader.result;
	process(raw);
}

function process(rawData) {
	let raw;
		try {
			raw = (new TextDecoder()).decode(rawData);
		}
		catch (error) {
			raw = rawData;
		}
	let rawp = raw.split(':');
	let rawsp = raw.split(' ');	
	if (rawsp[0] === 'PING') {	
		let pongResponse = raw.replace("PING","PONG");
		websocket.send(pongResponse);
	}
	else if (rawsp[1] == '396') { // мой ник и хост
		me = rawsp[2];
		myhost = rawsp[3];
	}
	else if (rawsp[1] == 'JOIN') {//Позволяет зайти на каналы. Также позволяет указать пароли, если они нужны. Если канал не существуют, он будет создан.
		onJoin( rawsp[0], rawsp[2].substring(1) );
	}
	else if (rawsp[1] == 'PRIVMSG') {//Отправляет сообщение
		if (rawsp[3] == ':ACTION' && rawp[2].substr(-1) == '') {
			if ( ignores_check( rawsp[0].substring(1), ['a','p','c']) ) {
				memsg(rawsp[0].substring(1), rawsp[2], rawp.splice(2).join(':'));
			}
		}
		else {
			if ( ignores_check( rawsp[0].substring(1), ['a','c']) ) {
				
				msg(raw);
			}
		}
	}
	else if (rawsp[1] == 'NICK') {
		
		onNick( getNickname(raw), rawp[2] );
	}
	else if (rawsp[1] == 'NOTICE') {
		
		if ( ignores_check( rawsp[0].substring(1), ['a','n']) ) {	
			onNotice( rawsp );
		}
	}
	else if (rawsp[1] == 'MODE') {	
		setMode( rawsp );
	}
}

function setMode(rawsp) {
	let chan_or_nick = rawsp[2];
	let modes = rawsp[3];
	modes = document.createTextNode(modes);
	let chan_nicks_mode = ' ';
	if (typeof rawsp[4] !== 'undefined') {
		chan_nicks_mode += rawsp.splice(4).join(' ');
	}
	
	let elem = document.createElement('p');
	if (chan_or_nick[0] === '#') {
		doSend('names ' + chan_or_nick);
		let nick = rawsp[0].split(':')[1].split('!')[0];
		let chan = chan_or_nick.substring(1);
		let chanspNoHTML = chan_or_nick.replace(/\</g, '').substring(1).toLowerCase();
		chanspNoHTML = chan_or_nick.replace(/\>/g, '').substring(1).toLowerCase();
		nick = document.createTextNode(nick);
		chan = document.createTextNode(chan);
		chan_nicks_mode = document.createTextNode(chan_nicks_mode);	
		elem.innerHTML = '&lt;'+ currentTime() +'&gt; * ';
		elem.appendChild(nick);
		elem.innerHTML += ' sets mode(s) ';
		elem.appendChild(modes);
		elem.appendChild(chan_nicks_mode);
		elem.innerHTML += ' on #';
		elem.appendChild(chan);	
		let w = document.getElementById('chan_' + chanspNoHTML);
		if (w != null) {
			w.appendChild(elem);
		}
		else {
			document.getElementById('status').appendChild(elem);
		};
	}
	else {
		chan_or_nick = document.createTextNode(chan_or_nick);
		elem.innerHTML = '&lt;'+ currentTime() +'&gt; * ';
		elem.appendChild(chan_or_nick);
		elem.innerHTML += ' mode(s) : ';
		elem.appendChild(modes);
		document.getElementById('status').appendChild(elem);
	}
}

function memsg(mask, target, message) {
	let nick = document.createTextNode(mask.split('!')[0]);
	let prefix;
	if (target.substr(0, 1) == '#') {
		target = target.substring(1).toLowerCase();
		prefix = 'chan_';
	}
	else {
		prefix = 'query_';
	}
	
	message = style(urlify(message.split('ACTION ')[1].split('')[0], '', false, false));
	let hlCheck = false, hlcolor = '';
	if (message.split(' ').indexOf(me) !== -1) { // HL
		hlCheck = true;
		hlcolor = 'hlcolor';
	}
	if (hlCheck) {
		hl(nick.textContent, message);
	}
	let w = document.getElementById(prefix + target);
	if (w !== null) {
		w.innerHTML += '<p><strong class="'+ hlcolor +'">&lt;' + currentTime() + '&gt; * <span style="color:blue;">' + nick.textContent + '</span></strong> ' + message.replace('', '') + '</p>';
	}
}

function style(msg) {
	let stx = 0, etx = 0, syn = 0, gs = 0, us = 0;
	let res = msg.replace(/(()|([0-9,]{0,5})|()|()|())/g, function(match, string) {
		if (match === '') {
			if (stx % 2 === 0) {
				stx++;
				let closure = string.split('')[stx];
				if (typeof closure !== 'undefined') {
					style(closure);
				}
				return '<span class="style_bold">';
			}
			else {
				stx++;
				return '<span style="font-weight:normal;">';
			}
		}
		else if (match === '') {
			if (syn % 2 === 0) {
				syn++;
				let closure = string.split('')[syn];
				if (typeof closure !== 'undefined') {	
					style(closure);
				}	
				return '<span style="color:white; background-color:black;">';
			}
			else {
				syn++;
				return '</span>';
			}
		}
	});
	return res;
}

function currentTime() {
	let today = new Date();	
	let h = checkTime( today.getHours() );
	let m = checkTime( today.getMinutes() );
	let s = checkTime( today.getSeconds() );	
	return h + ':' + m + ':' + s;
}

function checkTime(i) {
	if (i < 10) {
		i = "0" + i;
	}
	return i;
}

function onNick(oldnick, newnick) {
	if (oldnick == me) {
		me = newnick;
	}
	let oldnick_html = document.createTextNode(oldnick);
	for (var item in uls) {
		if (uls_no_mode[item].indexOf(oldnick) !== -1) {
			let elem = document.createElement('p');
			elem.innerHTML = '&lt;'+ currentTime() +'&gt; * ';
			elem.appendChild(oldnick_html);
			elem.innerHTML += ' is now ' + newnick;
			let w = document.getElementById('chan_' + item);
			w.appendChild(elem);
			doSend('names #' + item);
		}
	}
}

function currentDate() {
	let date = new Date();
	let d = checkTime( date.getDate() );
	let mo = checkTime( date.getMonth() + 1);
	let y = checkTime( date.getFullYear() );
	return d + '/' + mo + '/' + y;	
}

function log(server, target, line) {
	let serv = JSON.parse(logs.getItem(server));
	if (serv === null) {
		let obj = new Object();
		obj[target] = [ line ];
		logs.setItem(server, JSON.stringify( obj ) );
	}
	else {
		if (typeof serv[target] !== 'undefined') {
			if (serv[target].length > 250) {
				serv[target].shift();
			}
			serv[target].push( line );
			logs.setItem( server, JSON.stringify( serv ) );
		}
		else {
			serv[target] = [ line ];
			logs.setItem( server, JSON.stringify( serv ) );
		}
	}
}

function readLog(server, target, last) {
	let r = JSON.parse( logs.getItem(server) );
	if (r !== null && typeof r[target] !== 'undefined') {
		let len = r[target].length - 1;
		let start;
		
		if (last >= len) {
			start = len - last;
		}
		else {
			start = 0;
		}
		
		let output = '';
		for(var i = start; i <= len; i++) {
			if (typeof r[target][i] !== 'undefined') {
				let msg = style(urlify( r[target][i], '', false, false ));
				output += msg;
			}
		}
		return output;
	}
	return false;
}

function join(chan) {
	let chansp = chan.substring(1);
	let chanspNoHTML = chansp.replace(/\</g, '').toLowerCase();
	chanspNoHTML = chanspNoHTML.replace(/\>/g, '').toLowerCase();
	let channel_window = document.createElement('div');
	Array.from(document.getElementsByClassName('window')).forEach( closeAllWindows );
	channel_window.className = 'window chan wselected';
	channel_window.setAttribute('id', 'chan_' + chanspNoHTML);
	let lo = readLog(irc_server_address, '#' + chanspNoHTML, 250);
	
	if (lo !== false) {
		channel_window.innerHTML = lo;
		let w = document.getElementById('chan_' + chanspNoHTML);
	}
	
	let first_query = document.getElementsByClassName('query')[0];
	document.getElementById('msgs').insertBefore(channel_window, first_query);
	Array.from(document.getElementsByClassName('ul')).forEach(function(item) { item.className = 'ul ul_hidden' });
	let channel = document.createElement('p');
	channel.innerHTML = '<i aria-hidden="true"></i>' + escapeHtml(chansp);
	Array.from(document.getElementsByClassName('btn_selected')).forEach(function(item) { item.className = 'btn_window' });
	channel.setAttribute('class', 'btn_window btn_selected');
	channel.setAttribute('id', 'chan_btn_' + chanspNoHTML);
	chanlist.appendChild(channel);

	document.getElementById('cc_' + chanspNoHTML).onclick = function() {
		Array.from(document.getElementsByClassName('window')).forEach( closeAllWindows );
		doSend('part ' + chan);
	}
	
	Array.from(document.getElementsByClassName('chan_params')).forEach(function(item) {
		item.onclick = function() {
			let chan = '#' + this.id.substring(3);
			document.getElementById('chan_params').style.display = 'block';
			doSend('mode ' + chan + ' +b');
			doSend('mode ' + chan + ' +e');
		}
	});
	document.getElementById('editbox').style.display = 'block';
	document.getElementById('text').focus();
}

function msg(raw) {
	idmsg++;
	let mht = ht( escapeHtml( getMsg(raw) ) );
	let nick = getNickname(raw);
	let msg = style(urlify( mht[1], idmsg, true, false ));
	let msg_for_log = mht[1];
	let chan = raw.split(' ')[2].substring(1);
	let hlCheck = false, hlcolor = '';
	let chanlc = chan.toLowerCase();
	if (msg.toLowerCase().indexOf(me.toLowerCase()) !== -1) { // HL
		hlCheck = true;
		hlcolor = 'hlcolor';
	}
	
	let w = document.getElementById('chan_' + chanlc);
	let line = document.createElement('p');
	line.id = 'idmsg_' + idmsg;
	line.className = 'line';
	line.innerHTML = '<strong class="'+ hlcolor +'">&lt;' + currentTime() + '&gt; &lt;<span style="color:blue;">' + nick + '</span>&gt;</strong> ' + msg.replace('', '');
	let line_for_log = document.createElement('p');
	line_for_log.className = 'line log';
	line_for_log.innerHTML = '<strong class="'+ hlcolor +' nickname">' + currentDate() + ' - &lt;' + currentTime() + '&gt; &lt;<span style="color:blue;">' + nick + '</span>&gt;</strong> ' + msg_for_log.replace('', '');
	
	log(irc_server_address, '#' + chanlc, line_for_log.outerHTML);

	if (w !== null) {	
		w.appendChild(line);
		mht[0].forEach(function(item) {	
			document.getElementById(item).ondblclick = function() {	
				doSend( 'join #' + this.id.split('_')[1] );
			}
		});
		let elem = document.getElementById('chan_btn_' + chanlc);
		if (hlCheck === false) {	
			if (elem.className.indexOf('red') === -1 && elem.className.indexOf('btn_selected') === -1) {	
				elem.className += ' red';
			}
		}
		else {
			if (elem.className.indexOf('green') === -1 && elem.className.indexOf('btn_selected') === -1) {	
				elem.className += ' green';
			}
		}
	}
	if (hlCheck) {	
		hl(nick, msg);
	}
}

function getMsg(raw) {
	return raw.split('PRIVMSG')[1].split(':').splice(1).join(':');
}

function strip(html) {
   var tmp = document.createElement("DIV");
   tmp.innerHTML = html;
   return tmp.textContent || tmp.innerText || "";
}

function getNickname(raw) {	
	raw = raw.split(':')[1];
	let mask = raw.split('!');
	mask = mask[0].split(' ');
	return mask[0];
}

function getMask(raw) { 
	raw = raw.split(':')[1];
	let mask = raw.split('!');
	mask = mask[1].split(' ')[0];
	return mask;
}

function onJoin(user, chan) {
	let chansp = chan.substring(1);
	let chanspNoHTML = chansp.replace(/\</g, '').toLowerCase();	
	chanspNoHTML = chanspNoHTML.replace(/\>/g, '');	
	let nick = getNickname(user);
	let nickelem = document.createTextNode(nick);
	let mask = document.createTextNode(getMask(user));
	
	if (nick === me) {	
		ACStriped = chansp;
		activeChannel = chan;
		active = chan.toLowerCase();
		activeType = 'channel';
		join(chan);
		if (aj !== false && aj > 0) {
			aj--;
		}
		
		if (aj !== false && aj === 0) {	
			autojoins_check = true;
			aj = false;
			autojoins();
		}
	}
	let elem = document.createElement('p');
	//Надпись пользователь подключился
	elem.innerHTML = '<strong class="noboldcopy" style="color:green;">['+ currentTime() +'] [<span style="color:blue;">' + nickelem.textContent + '</span>] (' + mask.textContent + ') has joined ' + escapeHtml(chan) + '</strong>';
	let w = document.getElementById('chan_' + chanspNoHTML);
	w.appendChild(elem);
	let activeWindow = document.getElementsByClassName('wselected')[0];
	doSend('names ' + html_decode(chan));
}

function doSend(message) {
	websocket.send( (new TextEncoder()).encode(message).buffer );
}

function em(input) {
	var imgs = input.getElementsByTagName('img');
	for (var i = imgs.length - 1; i >= 0; i--) {
		var textNode = document.createElement('span');
		textNode.innerHTML = imgs[0].alt;
		imgs[0].parentNode.replaceChild(textNode, imgs[0]);
	}
	return input;
}

function send() {
	let input = document.getElementById('text');
	let text = input.innerHTML.replace(/<br\s*[\/]?>/gi, "\n");
	let recipient = active;
	if (text[0] == '/') {
		exec( text.substring(1) );
	}
	else if (text) {	
		let inputText = em(input);
		doSend('privmsg ' + recipient + ' :' + inputText.innerText);
		idmsg++;
		let lines = Array.from(input.getElementsByTagName('div'));
		let query = document.getElementsByClassName('wselected')[0];
		let w = document.getElementById('chan_' + ACStriped.toLowerCase());

		if (query.className.indexOf('query') !== -1) {
			recipient = query.id.substring(6);
			w = query;
		}
		
		if (lines.length === 0) {
			lines = Array.from(input.getElementsByTagName('p'));
			if (lines.length === 0) {
				let message = style(urlify( text, idmsg, true, recipient ));
				let msg_for_log = style( text );
				let line = document.createElement('p');
				line.id = 'idmsg_' + idmsg;
				line.className = 'line';
				line.innerHTML = '<strong class="nickname">&lt;'+ currentTime() +'&gt; &lt;' + me + '&gt; </strong>';
				var mht = ht( message );
				line.innerHTML += mht[1];
				w.appendChild(line);
				let line_for_log = document.createElement('p');
				line_for_log.className = 'line log';
				line_for_log.innerHTML = '<strong class="nickname">' + currentDate() + ' - &lt;'+ currentTime() +'&gt; &lt;' + me + '&gt; </strong>';
				line_for_log.innerHTML += msg_for_log;
				log(irc_server_address, recipient.toLowerCase(), line_for_log.outerHTML);
			}
			else {//отправка сообщения пользователям
				let first_line = document.createElement('div');
				first_line.innerHTML = input.childNodes[0].nodeValue;
				lines.unshift(first_line);
				lines.forEach(function(item, index) {
					let message = style(urlify( item.innerHTML, idmsg, true, recipient ));
					let msg_for_log = style( text );
					let line = document.createElement('p');
					line.id = 'idmsg_' + idmsg;
					line.className = 'line';
					line.innerHTML = '<strong class="nickname">&lt;'+ currentTime() +'&gt; &lt;' + me + '&gt; </strong>';
					var mht = ht( message );
					line.innerHTML += mht[1];
					w.appendChild(line);
					let line_for_log = document.createElement('p');
					line_for_log.className = 'line log';
					line_for_log.innerHTML = '<strong class="nickname">' + currentDate() + ' - &lt;'+ currentTime() +'&gt; &lt;' + me + '&gt; </strong>';
					line_for_log.innerHTML += msg_for_log;
					log(irc_server_address, recipient.toLowerCase(), line_for_log.outerHTML);
				});
			}
		}	
		mht[0].forEach(function(item) {
			document.getElementById(item).ondblclick = function() {				
				doSend( 'join #' + this.id.split('_')[1] );
			}
		});
		document.getElementById('text');
	}
	input.innerHTML = '';
}

//Закрытие окон чтобы не наслаивались чаты каналов
function closeAllWindows(item, index) {
	if (item.id == 'status' || item.id == 'gchanlist') {
		item.className = 'window';
	}
	else {
		if (item.className.indexOf('query') !== -1) {
			item.className = 'window query';
		}
		else if (item.className.indexOf('chan') !== -1) {
			item.className = 'window chan';
		}
	}
}

function urlify(text, idm, ajaxRequest, recipient, status) {//для преобразования символов разных языков в валидный url.
	let msg = text;
	msg = msg.replace('&nbsp;', ' ');
	let words = msg.split(' ');
    let urlRegex = /((ftp|http|https):\/\/|www\.)[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([\)\(-a-zA-Z0-9@:%_\+.~#?&\/=,;]*)/gi;
    let i = -1;
    words.forEach(function(item, index) {
		words[index] = item.replace(urlRegex, function(url) {	
			if (url.substr(-1, 1) === '.') {	
				url = url.substr(0, url.length - 1);
			}
	
			let proto = url.split('://')[0].toLowerCase();
			if (proto !== 'http' || proto !== 'https' || proto !== 'ftp') {	
				proto = 'https';
			}
			
			let href = url.match(/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([\)\(-a-zA-Z0-9@:%_\+.~#?&\/=,;]*)/gi)[0];
			let mailto = '';	
			if (url.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) !== null) {	
				mailto = 'mailto:';
			}
			return '<a href="' + strip(mailto) + strip(proto) + '://' + strip(href) + '" target="_blank">' + url + '</a>';
		});
	});
	return words.join(' ');
}