(function(global, factory) {
    // UMD
    if(typeof exports === 'object' && typeof module !== 'undefined')
        module.exports = factory;
    // AMD
    else if(typeof define === 'function' && define.amd)
        define(factory)
    else
        global.Noteor = factory
})(this, function Noteor(v = {}) {
    if(this.constructor.name != 'Noteor')
        return console.error('u must to call by constructor');

    if(!v.element) return console.error('no parameter element');

    
    v.element.setAttribute('spellcheck', false);

    // remove all linebreak
    v.element.innerHTML = v.element.innerHTML.replace(/(\r\n\t|\n|\r\t)/gm,"");

    this.blockList = [];
    this.eventCall = {};

    /**
     * 에디터가 작동하게 되는 기본 모듈
     */
    function main(global) {
        // 블록들을 (재)갱신한다.
        const blockListInit = () => {
            let blocks = [];

            const setBlockToEditMode = (element, index) => {
                   element.index = index;

                /* * in test mode * */
                element.setAttribute('index', index)
                
                if(element.editMode) return;
                if(!isBlock(element)) return;

                element.editMode = true;

                if(!element.getAttribute('contentEditable'))
                    element.setAttribute('contentEditable', '');
                    
                element.addEventListener('keypress', this.blockKeyDownEvent);
            }

            const init = () => {
                let nodes = v.element.querySelectorAll('*');
                    nodes = Array.prototype.slice.call(nodes);

                nodes = nodes.filter(block => block.tagName != 'UL' && block.tagName != 'OL');


                blocks = global.blockList = nodes;
                
                for(let num in blocks)
                    setBlockToEditMode(blocks[num], num);
            }
            init();
        }
        const ignoreTag = [
            'HR', 'UL', 'OL'
        ];
        const isBlock = (el) => {
            const isNotTextNode  = (el) => !(el.nodeType === Node.TEXT_NODE);
            const isNotIgnoreTag = (el) => !(ignoreTag.filter(i => i == el.tagName)[0]);

            return el ? (isNotTextNode(el) && isNotIgnoreTag(el)) : 0;
        }
        
        (function globalFunctions_aboutBlock(_this) {
            function __selectBlockDirectionInstance(block, direction) {
                // if(isBlock(block.previousSibling))
                const blockList = global.blockList;

                let selectBlockDirection = () =>
                    direction == 'prev' ?
                    blockList[block.index - 1] :
                    blockList[+ block.index + 1] ;


                let selectedBlock = selectBlockDirection();

                // while(!isBlock(selectedBlock) && selectedBlock) {
                // while(selectedBlock) {
                //     console.log(!selectedBlock)
                //     selectedBlock = selectBlockDirection();
                // }

                return selectedBlock;
            }
            const _selectPrevBlock = (block) => __selectBlockDirectionInstance(block, 'prev');
            const _selectNextBlock = (block) => __selectBlockDirectionInstance(block, 'next');


            // @param pos => if null = first position, if 0 = last position, if 양수 = position, if 음수 = reverse position
            function focusCursorPositionOfBlock(block, pos) {
                if(!window.getSelection) return;
                const text = block.innerText;
                
                const range = document.createRange();
                const sel = window.getSelection();
                
                let textElement = block.firstChild;

                if(!textElement) {
                    textElement = document.createTextNode('');
                    block.append(textElement);
                }

                let textCount = textElement.length;


                if(pos === null) {
                    block.focus();
                    return;
                }
                if(pos === 0)pos = textCount;
                if(pos < 0)  pos = textCount + pos;



                range.setStart(textElement, pos);
                range.collapse(true)
                
                sel.removeAllRanges()
                sel.addRange(range)
            }
            function getCursorPosition(element) {
                var caretOffset = 0;
              
                if (window.getSelection) {
                  var range = window.getSelection().getRangeAt(0);
                  var preCaretRange = range.cloneRange();
                  preCaretRange.selectNodeContents(element);
                  preCaretRange.setEnd(range.endContainer, range.endOffset);
                  caretOffset = preCaretRange.toString().length;
                } 
              
                else if (document.selection && document.selection.type != "Control") {
                  var textRange = document.selection.createRange();
                  var preCaretTextRange = document.body.createTextRange();
                  preCaretTextRange.moveToElementText(element);
                  preCaretTextRange.setEndPoint("EndToEnd", textRange);
                  caretOffset = preCaretTextRange.text.length;
                }
              
                return caretOffset;
            }

            function replaceTag(element, tagName) {
                const tag = document.createElement(tagName)
                tag.innerHTML = element.innerHTML;

                element.parentNode.replaceChild(tag, element)
                blockListInit();
                tag.focus();

                return tag;
            }
            
            const addBlockNextTo = function(element, tagName = 'p') {
                const tag = document.createElement(tagName);

                if(element)
                     element.parentNode.insertBefore(tag, element.nextSibling);

                if(isBlock(tag))
                    tag.focus();

                return tag;
            }

            const getMarkdownCharCount_OnFirstWord = 
            function(text, MDchar) {
                const regex = new RegExp('^' + MDchar + '+', "g");
    
                const isOnlyOneChars = text.match(regex);

                const count = () => {
                    const regex = new RegExp(MDchar, "g");
    
                    return isOnlyOneChars[0].match(regex).length;
                }
                return isOnlyOneChars ? count() : 0;
            }

            
            const hotKey = {
                __instance_up_down: (e, block, direction = 'up') => {
                    e.preventDefault();

                    if(block.children.length != 0) return;

                    const targetBlock = global.blockList[(direction == 'up' ? -1 : 1) + + block.index];

                    if(targetBlock)
                        focusCursorPositionOfBlock(targetBlock, 0);
                },
                up  : function(e, block) { this.__instance_up_down(e, block, 'up') },
                down: function(e, block) { this.__instance_up_down(e, block, 'down') },

                left: (e, block) => {
                    if(getCursorPosition(block) == 0) {
                        e.preventDefault();
                        const prevBlock = _selectPrevBlock(block)

                        if(!prevBlock) return;
                        focusCursorPositionOfBlock(prevBlock, 0);
                    }
                },
                right: (e, block) => {
                    if(getCursorPosition(block) == block.innerText.length) {
                        e.preventDefault();
                        const nextBlock = _selectNextBlock(block);
                        if(!nextBlock) return;
                        focusCursorPositionOfBlock(nextBlock, null);
                    }
                },
                enter: (e, block) => {
                    e.preventDefault();

                    if(block.tagName == 'LI') {
                        const nextBlock = _selectNextBlock(block);
                        addBlockNextTo(block, 'LI');
                        blockListInit();
                    }
                    else if(!_selectNextBlock(block)) {
                        addBlockNextTo(block, 'P');
                        blockListInit();
                    }
                    
                    nextBlock = _selectNextBlock(block);

                    /**
                     * 다음 블럭에 현재 커서 이후 블럭의 내용을 붙여넣음.
                     */
                    {
                        if(!window.getSelection) return;

                        const blockText = block.innerText;

                        const sel = window.getSelection();

                        const cursorStart = sel.anchorOffset;
                        const cursorEnd   = sel.focusOffset;
                        // const node        = sel.anchorNode;

                        const AfterCursorContent = blockText.substring(cursorStart, blockText.length);
                        const BeforeCursorContent = blockText.substring(0, cursorStart);

                        block.innerText = BeforeCursorContent;
                        nextBlock.innerText = AfterCursorContent + nextBlock.innerText; 
                    }

                    nextBlock.focus();
                },
                back: (e, block) => {
                    if(!window.getSelection) return;

                    const sel = window.getSelection();
                    const cursorStart = sel.anchorOffset;

                    if(cursorStart == 0)
                        if(block.tagName == 'P' || block.tagName == 'DIV' || block.tagName == 'LI') {
                            e.preventDefault();
                            const prev = _selectPrevBlock(block);
                            blockListInit();

                            if(!prev) return;
                            prev.innerText += block.innerText;

                            focusCursorPositionOfBlock(prev, -block.innerText.length);

                            block.parentNode.removeChild(block);
                            blockListInit();

                            const BlockCount = +global.blockList.length - 1;
                            if(!BlockCount) {
                                addBlockNextTo();
                                blockListInit();
                            }
                        }
                        else { // is not P tag
                            replaceTag(block, 'P');
                            blockListInit();
                        }
                },
                space: (e, block) => {
                    const text = block.innerText.substring(0, 10);
                    
                    // #, ##, ###, ... => h1, h2, h3, ...
                    if(text.charAt(0) == '#') {
                        count = getMarkdownCharCount_OnFirstWord(text, '#');

                        if(count > 6) return;
                            
                        if(!count || getCursorPosition(block) != count) return;
                        e.preventDefault();
                        

                        const tag = replaceTag(block , 'h' + count);
                        tag.innerText = tag.innerText.substring(count, tag.innerText.length);
                        focusCursorPositionOfBlock(tag, null);
                    }
                    else if(text.substring(0, 3) == '---') {
                        count = getMarkdownCharCount_OnFirstWord(text, '-');
                        
                        if(!(count == 3) || getCursorPosition(block) != count) return;
                        e.preventDefault();
                        addBlockNextTo(block, 'hr');
                        blockListInit();

                        block.innerText = block.innerText.substring(3, block.innerText.length)
                        focusCursorPositionOfBlock(block, null);
                    }
                    else if(text.charAt(0) == '-') {
                        if(!(getCursorPosition(block) == 1)) return;
                        e.preventDefault();

                        block = replaceTag(block , 'li');
                        block.insertAdjacentHTML('afterend', '<ul></ul>');
                        const ul_tag = block.nextSibling;

                        block.innerText = block.innerText.substring(1, block.innerText.length);
                        ul_tag.append(block);
                        block.focus();

                        blockListInit();
                    }
                    else if(text.charAt(0).match(/^[1-9]/)) {
                        const MarkdownNumberMethod = (text.match(/^[0-9]+\)/) || [])[0];
                        
                        if(!MarkdownNumberMethod) return;

                        if(getCursorPosition(block) != MarkdownNumberMethod.length) return;

                        const startNumber = MarkdownNumberMethod.substring(0, --MarkdownNumberMethod.length);
                        
                        block = replaceTag(block , 'li');
                        block.insertAdjacentHTML('afterend', '<ol></ol>');
                        const ol_tag = block.nextSibling;

                        block.innerText = block.innerText.substring(MarkdownNumberMethod.length, block.innerText.length);
                        ol_tag.setAttribute('start', startNumber);
                        ol_tag.append(block);
                        block.focus();
                        blockListInit();
                        // '11 asd a '.match(/^[0-9]+/g)
                    }
                    // else if(text.substring(0, 3) == '[ ]') {
                    //     if(getCursorPosition(block) != 3) return;
                    //     e.preventDefault();

                    //     block.innerHTML += '<input type="checkbox">'
                    // }
                },

                shift_enter: (e, block) => {
                },

                ctrl_X: (e, block) => {
                    // when any selection not exists
                }
            }
            const blockKeyDownEvent = _this.blockKeyDownEvent = function(e) {
                const keyCode = e.keyCode;

                alert(e.keyCode);

                if(e.shiftKey && e.keyCode == 13)
                    hotKey.shift_enter(e, this);
                else if(keyCode == 38) hotKey.up(e, this);
                else if(keyCode == 40) hotKey.down(e, this);
                else if(keyCode == 37) hotKey.left(e, this);
                else if(keyCode == 39) hotKey.right(e, this);
                else if(keyCode == 13) hotKey.enter(e, this);
                else if(keyCode == 8) hotKey.back(e, this);
                else if(keyCode == 32) hotKey.space(e, this);
            }
        })(this);

        blockListInit();
    }
    new main(this);

    return this;
})