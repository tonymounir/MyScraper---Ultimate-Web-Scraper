// This script is injected into the page to allow element selection.
(function() {
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.backgroundColor = 'rgba(97, 175, 239, 0.5)';
    overlay.style.border = '2px solid #61afef';
    overlay.style.zIndex = '999999';
    overlay.style.pointerEvents = 'none';
    document.body.appendChild(overlay);

    function mouseMoveHandler(e) {
        const target = e.target;
        const rect = target.getBoundingClientRect();
        overlay.style.width = `${rect.width}px`;
        overlay.style.height = `${rect.height}px`;
        overlay.style.top = `${rect.top + window.scrollY}px`;
        overlay.style.left = `${rect.left + window.scrollX}px`;
    }

    function clickHandler(e) {
        e.preventDefault();
        e.stopPropagation();

        const target = e.target;
        const selector = getCssSelector(target);

        chrome.runtime.sendMessage({ action: "selectorPicked", selector: selector });

        // Cleanup
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('click', clickHandler, true);
        document.body.removeChild(overlay);
    }

    // A simple but effective function to generate a CSS selector for an element
    function getCssSelector(el) {
        if (!(el instanceof Element)) return;
        const path = [];
        while (el.nodeType === Node.ELEMENT_NODE) {
            let selector = el.nodeName.toLowerCase();
            if (el.id) {
                selector += '#' + el.id;
                path.unshift(selector);
                break;
            } else {
                let sib = el, nth = 1;
                while (sib = sib.previousElementSibling) {
                    if (sib.nodeName.toLowerCase() == selector)
                       nth++;
                }
                if (nth != 1)
                    selector += `:nth-of-type(${nth})`;
            }
            path.unshift(selector);
            el = el.parentNode;
        }
        return path.join(' > ');
    }

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('click', clickHandler, { capture: true, once: true });
})();
