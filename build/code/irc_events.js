let rememberLines = [], irl = -1;
let chanc = 0, ccindex, cclen, cccursor, newcursor, hindex = false, hindex_iter, htag;
let numLines = 0, editbox = '';

(function() 
{
	let textarea = document.getElementById('text');
	textarea.onkeydown = function(e) {	
		let elem = e.currentTarget;	
		if (e.keyCode == 13) { //кнопка enter		
			e.preventDefault();		
			if (elem.innerHTML && rememberLines.length < 31) {			
				rememberLines.unshift( elem.innerHTML );			
				irl = -1;
			}			
			send();
		}
	}
		
	let btn_add_chan = document.getElementById('btn_add_chan');	
	btn_add_chan.onclick = function(e) {	
		e.stopPropagation();	
		bubble.style.marginLeft = 24 * 2 - 18 + 'px';
		bubble.style.display = 'inline-block';
		Array.from(document.getElementsByClassName('options')).forEach(closeContentBubble);
		document.getElementById('addchan').style.setProperty('display', 'block');	
		document.getElementById('newchan').focus();
	}
	
	let newchan = document.getElementById('create_newchan');	
	newchan.onclick = function() {		
		let chan = document.getElementById('newchan').value;		
		if (chan[0] !== '#') {
			chan = '#' + chan;
		}		
		doSend('join ' + chan);		
		document.getElementById('bubble').style.setProperty('display', 'none');
	}
	
	function closeContentBubble(item, index) {
		item.style.setProperty('display', 'none');
	}	
	init();	
	connectWebSocket();	
})();