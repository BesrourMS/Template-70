(function() {
            var on = addEventListener,
                $ = function(q) {
                    return document.querySelector(q)
                },
                $$ = function(q) {
                    return document.querySelectorAll(q)
                },
                $body = document.body,
                $inner = $('.inner'),
                client = (function() {
                    var o = {
                            browser: 'other',
                            browserVersion: 0,
                            os: 'other',
                            osVersion: 0,
                            canUse: null
                        },
                        ua = navigator.userAgent,
                        a, i;
                    a = [
                        ['firefox', /Firefox\/([0-9\.]+)/],
                        ['edge', /Edge\/([0-9\.]+)/],
                        ['safari', /Version\/([0-9\.]+).+Safari/],
                        ['chrome', /Chrome\/([0-9\.]+)/],
                        ['ie', /Trident\/.+rv:([0-9]+)/]
                    ];
                    for (i = 0; i < a.length; i++) {
                        if (ua.match(a[i][1])) {
                            o.browser = a[i][0];
                            o.browserVersion = parseFloat(RegExp.$1);
                            break;
                        }
                    }
                    a = [
                        ['ios', /([0-9_]+) like Mac OS X/, function(v) {
                            return v.replace('_', '.').replace('_', '');
                        }],
                        ['ios', /CPU like Mac OS X/, function(v) {
                            return 0
                        }],
                        ['android', /Android ([0-9\.]+)/, null],
                        ['mac', /Macintosh.+Mac OS X ([0-9_]+)/, function(v) {
                            return v.replace('_', '.').replace('_', '');
                        }],
                        ['windows', /Windows NT ([0-9\.]+)/, null],
                        ['undefined', /Undefined/, null],
                    ];
                    for (i = 0; i < a.length; i++) {
                        if (ua.match(a[i][1])) {
                            o.os = a[i][0];
                            o.osVersion = parseFloat(a[i][2] ? (a[i][2])(RegExp.$1) : RegExp.$1);
                            break;
                        }
                    }
                    var _canUse = document.createElement('div');
                    o.canUse = function(p) {
                        var e = _canUse.style,
                            up = p.charAt(0).toUpperCase() + p.slice(1);
                        return (p in e || ('Moz' + up) in e || ('Webkit' + up) in e || ('O' + up) in e || ('ms' + up) in e);
                    };
                    return o;
                }()),
                trigger = function(t) {
                    if (client.browser == 'ie') {
                        var e = document.createEvent('Event');
                        e.initEvent(t, false, true);
                        dispatchEvent(e);
                    } else dispatchEvent(new Event(t));
                },
                cssRules = function(selectorText) {
                    var ss = document.styleSheets,
                        a = [],
                        f = function(s) {
                            var r = s.cssRules,
                                i;
                            for (i = 0; i < r.length; i++) {
                                if (r[i] instanceof CSSMediaRule && matchMedia(r[i].conditionText).matches)(f)(r[i]);
                                else if (r[i] instanceof CSSStyleRule && r[i].selectorText == selectorText) a.push(r[i]);
                            }
                        },
                        x, i;
                    for (i = 0; i < ss.length; i++) f(ss[i]);
                    return a;
                };
            var thisURL = function() {
                    return window.location.href.replace(window.location.search, '').replace(/#$/, '');
                },
                getVar = function(name) {
                    var a = window.location.search.substring(1).split('&'),
                        b, k;
                    for (k in a) {
                        b = a[k].split('=');
                        if (b[0] == name) return b[1];
                    }
                    return null;
                },
                cmd = function(cmd, values, handler) {
                    var x, k, data;
                    data = new FormData;
                    data.append('cmd', cmd);
                    for (k in values) data.append(k, values[k]);
                    x = new XMLHttpRequest();
                    x.open('POST', 'post/cmd');
                    x.onreadystatechange = function() {
                        var o;
                        if (x.readyState != 4) return;
                        if (x.status != 200) throw new Error('Failed server response (' + x.status + ')');
                        try {
                            o = JSON.parse(x.responseText);
                        } catch (e) {
                            throw new Error('Invalid server response');
                        }
                        if (!('result' in o) || !('message' in o)) throw new Error('Incomplete server response');
                        if (o.result !== true) throw new Error(o.message);
                        (handler)(o);
                    };
                    x.send(data);
                },
                redirectToStripeCheckout = function(options) {
                    cmd('stripeCheckoutStart', options, function(response) {
                        Stripe(options.key).redirectToCheckout({
                            sessionId: response.sessionId
                        }).then(function(result) {
                            alert(result.error.message);
                        });
                    });
                },
                errors = {
                    handle: function(handler) {
                        window.onerror = function(message) {
                            (handler)(message);
                            return true;
                        };
                    },
                    unhandle: function() {
                        window.onerror = null;
                    }
                },
                db = {
                    open: function(objectStoreName, handler) {
                        var request = indexedDB.open('carrd');
                        request.onupgradeneeded = function(event) {
                            event.target.result.createObjectStore(objectStoreName, {
                                keyPath: 'id'
                            });
                        };
                        request.onsuccess = function(event) {
                            (handler)(event.target.result.transaction([objectStoreName], 'readwrite').objectStore(objectStoreName));
                        };
                    },
                    put: function(objectStore, values, handler) {
                        var request = objectStore.put(values);
                        request.onsuccess = function(event) {
                            (handler)();
                        };
                        request.onerror = function(event) {
                            throw new Error('db.put: error');
                        };
                    },
                    get: function(objectStore, id, handler) {
                        var request = objectStore.get(id);
                        request.onsuccess = function(event) {
                            if (!event.target.result) throw new Error('db.get: could not retrieve object with id "' + id + '"');
                            (handler)(event.target.result);
                        };
                        request.onerror = function(event) {
                            throw new Error('db.get: error');
                        };
                    },
                    delete: function(objectStore, id, handler) {
                        objectStore.delete(id).onsuccess = function(event) {
                            (handler)(event.target.result);
                        };
                    },
                };
            on('load', function() {
                setTimeout(function() {
                    $body.className = $body.className.replace(/\bis-loading\b/, 'is-playing');
                    setTimeout(function() {
                        $body.className = $body.className.replace(/\bis-playing\b/, 'is-ready');
                    }, 1000);
                }, 100);
            });
            (function() {
                var initialSection, initialScrollPoint, initialId, header, footer, name, hideHeader, hideFooter, h, e, ee, k, locked = false,
                    doNext = function() {
                        var section;
                        section = $('#main > .inner > section.active').nextElementSibling;
                        if (!section || section.tagName != 'SECTION') return;
                        location.href = '#' + section.id.replace(/-section$/, '');
                    },
                    doPrevious = function() {
                        var section;
                        section = $('#main > .inner > section.active').previousElementSibling;
                        if (!section || section.tagName != 'SECTION') return;
                        location.href = '#' + (section.matches(':first-child') ? '' : section.id.replace(/-section$/, ''));
                    },
                    doScroll = function(e, style, duration) {
                        var y, cy, dy, start, easing, f;
                        if (!e) y = 0;
                        else switch (e.dataset.scrollBehavior ? e.dataset.scrollBehavior : 'default') {
                            case 'default':
                            default:
                                y = e.offsetTop;
                                break;
                            case 'center':
                                if (e.offsetHeight < window.innerHeight) y = e.offsetTop - ((window.innerHeight - e.offsetHeight) / 2);
                                else y = e.offsetTop;
                                break;
                            case 'previous':
                                if (e.previousElementSibling) y = e.previousElementSibling.offsetTop + e.previousElementSibling.offsetHeight;
                                else y = e.offsetTop;
                                break;
                        }
                        if (!style) style = 'smooth';
                        if (!duration) duration = 750;
                        if (style == 'instant') {
                            window.scrollTo(0, y);
                            return;
                        }
                        start = Date.now();
                        cy = window.scrollY;
                        dy = y - cy;
                        switch (style) {
                            case 'linear':
                                easing = function(t) {
                                    return t
                                };
                                break;
                            case 'smooth':
                                easing = function(t) {
                                    return t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
                                };
                                break;
                        }
                        f = function() {
                            var t = Date.now() - start;
                            if (t >= duration) window.scroll(0, y);
                            else {
                                window.scroll(0, cy + (dy * easing(t / duration)));
                                requestAnimationFrame(f);
                            }
                        };
                        f();
                    },
                    sections = {};
                window._next = doNext;
                window._previous = doPrevious;
                if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
                header = $('#header');
                footer = $('#footer');
                h = location.hash ? location.hash.substring(1) : null;
                if (h && !h.match(/^[a-zA-Z]/)) h = 'x' + h;
                if (e = $('[data-scroll-id="' + h + '"]')) {
                    initialScrollPoint = e;
                    initialSection = initialScrollPoint.parentElement;
                    initialId = initialSection.id;
                } else if (e = $('#' + (h ? h : 'home') + '-section')) {
                    initialScrollPoint = null;
                    initialSection = e;
                    initialId = initialSection.id;
                }
                name = (h ? h : 'home');
                hideHeader = name ? ((name in sections) && ('hideHeader' in sections[name]) && sections[name].hideHeader) : false;
                hideFooter = name ? ((name in sections) && ('hideFooter' in sections[name]) && sections[name].hideFooter) : false;
                if (header && hideHeader) {
                    header.classList.add('hidden');
                    header.style.display = 'none';
                }
                if (footer && hideFooter) {
                    footer.classList.add('hidden');
                    footer.style.display = 'none';
                }
                ee = $$('#main > .inner > section:not([id="' + initialId + '"])');
                for (k = 0; k < ee.length; k++) {
                    ee[k].className = 'inactive';
                    ee[k].style.display = 'none';
                }
                initialSection.classList.add('active');
                doScroll(null, 'instant');
                on('load', function() {
                    if (initialScrollPoint) doScroll(initialScrollPoint, 'instant');
                });
                on('hashchange', function(event) {
                    var section, scrollPoint, id, sectionHeight, currentSection, currentSectionHeight, name, hideHeader, hideFooter, h, e, ee, k;
                    if (locked) return false;
                    h = location.hash ? location.hash.substring(1) : null;
                    if (e = $('[data-scroll-id="' + h + '"]')) {
                        scrollPoint = e;
                        section = scrollPoint.parentElement;
                        id = section.id;
                    } else if (e = $('#' + (h ? h : 'home') + '-section')) {
                        scrollPoint = null;
                        section = e;
                        id = section.id;
                    } else return false;
                    if (!section) return false;
                    if (!section.classList.contains('inactive')) {
                        if (scrollPoint) doScroll(scrollPoint);
                        else doScroll(null);
                        return false;
                    } else {
                        locked = true;
                        if (location.hash == '#home') history.replaceState(null, null, '#');
                        currentSection = $('section:not(.inactive)');
                        if (currentSection) {
                            currentSection.classList.add('inactive');
                            setTimeout(function() {
                                currentSection.style.display = 'none';
                                currentSection.classList.remove('active');
                            }, 250);
                        }
                        setTimeout(function() {
                            section.style.display = '';
                            trigger('resize');
                            doScroll(null, 'instant');
                            setTimeout(function() {
                                section.classList.remove('inactive');
                                section.classList.add('active');
                                setTimeout(function() {
                                    if (scrollPoint) doScroll(scrollPoint, 'instant');
                                    locked = false;
                                }, 500);
                            }, 75);
                        }, 250);
                    }
                    return false;
                });
                on('click', function(event) {
                    var t = event.target;
                    if (t.tagName == 'IMG' && t.parentElement && t.parentElement.tagName == 'A') t = t.parentElement;
                    if (t.tagName == 'A' && t.getAttribute('href').substr(0, 1) == '#' && t.hash == window.location.hash) {
                        event.preventDefault();
                        history.replaceState(undefined, undefined, '#');
                        location.replace(t.hash);
                    }
                });
            })();
            var style, sheet, rule;
            style = document.createElement('style');
            style.appendChild(document.createTextNode(''));
            document.head.appendChild(style);
            sheet = style.sheet;
            if (client.os == 'android') {
                (function() {
                    sheet.insertRule('body::after { }', 0);
                    rule = sheet.cssRules[0];
                    var f = function() {
                        rule.style.cssText = 'height: ' + (Math.max(screen.width, screen.height)) + 'px';
                    };
                    on('load', f);
                    on('orientationchange', f);
                    on('touchmove', f);
                })();
            } else if (client.os == 'ios') {
                if (client.osVersion <= 11)(function() {
                    sheet.insertRule('body::after { }', 0);
                    rule = sheet.cssRules[0];
                    rule.style.cssText = '-webkit-transform: scale(1.0)';
                })();
                if (client.osVersion <= 11)(function() {
                    sheet.insertRule('body.ios-focus-fix::before { }', 0);
                    rule = sheet.cssRules[0];
                    rule.style.cssText = 'height: calc(100% + 60px)';
                    on('focus', function(event) {
                        $body.classList.add('ios-focus-fix');
                    }, true);
                    on('blur', function(event) {
                        $body.classList.remove('ios-focus-fix');
                    }, true);
                })();
            } else if (client.browser == 'ie') {
                if (!('matches' in Element.prototype)) Element.prototype.matches = (Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector);
                (function() {
                    var a = cssRules('body::before'),
                        r;
                    if (a.length > 0) {
                        r = a[0];
                        if (r.style.width.match('calc')) {
                            r.style.opacity = 0.9999;
                            setTimeout(function() {
                                r.style.opacity = 1;
                            }, 100);
                        } else {
                            document.styleSheets[0].addRule('body::before', 'content: none !important;');
                            $body.style.backgroundImage = r.style.backgroundImage.replace('url("images/', 'url("assets/images/');
                            $body.style.backgroundPosition = r.style.backgroundPosition;
                            $body.style.backgroundRepeat = r.style.backgroundRepeat;
                            $body.style.backgroundColor = r.style.backgroundColor;
                            $body.style.backgroundAttachment = 'fixed';
                            $body.style.backgroundSize = r.style.backgroundSize;
                        }
                    }
                })();
                (function() {
                    var t, f;
                    f = function() {
                        var mh, h, s, xx, x, i;
                        x = $('#wrapper');
                        x.style.height = 'auto';
                        if (x.scrollHeight <= innerHeight) x.style.height = '100vh';
                        xx = $$('.container.full');
                        for (i = 0; i < xx.length; i++) {
                            x = xx[i];
                            s = getComputedStyle(x);
                            x.style.minHeight = '';
                            x.style.height = '';
                            mh = s.minHeight;
                            x.style.minHeight = 0;
                            x.style.height = '';
                            h = s.height;
                            if (mh == 0) continue;
                            x.style.height = (h > mh ? 'auto' : mh);
                        }
                    };
                    (f)();
                    on('resize', function() {
                        clearTimeout(t);
                        t = setTimeout(f, 250);
                    });
                    on('load', f);
                })();
            } else if (client.browser == 'edge') {
                (function() {
                    var xx = $$('.container > .inner > div:last-child'),
                        x, y, i;
                    for (i = 0; i < xx.length; i++) {
                        x = xx[i];
                        y = getComputedStyle(x.parentNode);
                        if (y.display != 'flex' && y.display != 'inline-flex') continue;
                        x.style.marginLeft = '-1px';
                    }
                })();
            }
            if (!client.canUse('object-fit')) {
                (function() {
                    var xx = $$('.image[data-position]'),
                        x, w, c, i, src;
                    for (i = 0; i < xx.length; i++) {
                        x = xx[i];
                        c = x.firstElementChild;
                        if (c.tagName != 'IMG') {
                            w = c;
                            c = c.firstElementChild;
                        }
                        if (c.parentNode.classList.contains('deferred')) {
                            c.parentNode.classList.remove('deferred');
                            src = c.getAttribute('data-src');
                            c.removeAttribute('data-src');
                        } else src = c.getAttribute('src');
                        c.style['backgroundImage'] = 'url(\'' + src + '\')';
                        c.style['backgroundSize'] = 'cover';
                        c.style['backgroundPosition'] = x.dataset.position;
                        c.style['backgroundRepeat'] = 'no-repeat';
                        c.src = 'data:image/svg+xml;charset=utf8,' + escape('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" viewBox="0 0 1 1"></svg>');
                        if (x.classList.contains('full') && (x.parentNode && x.parentNode.classList.contains('full')) && (x.parentNode.parentNode && x.parentNode.parentNode.parentNode && x.parentNode.parentNode.parentNode.classList.contains('container')) && x.parentNode.children.length == 1) {
                            (function(x, w) {
                                var p = x.parentNode.parentNode,
                                    f = function() {
                                        x.style['height'] = '0px';
                                        clearTimeout(t);
                                        t = setTimeout(function() {
                                            if (getComputedStyle(p).flexDirection == 'row') {
                                                if (w) w.style['height'] = '100%';
                                                x.style['height'] = (p.scrollHeight + 1) + 'px';
                                            } else {
                                                if (w) w.style['height'] = 'auto';
                                                x.style['height'] = 'auto';
                                            }
                                        }, 125);
                                    },
                                    t;
                                on('resize', f);
                                on('load', f);
                                (f)();
                            })(x, w);
                        }
                    }
                })();
                (function() {
                    var xx = $$('.gallery img'),
                        x, p, i, src;
                    for (i = 0; i < xx.length; i++) {
                        x = xx[i];
                        p = x.parentNode;
                        if (p.classList.contains('deferred')) {
                            p.classList.remove('deferred');
                            src = x.getAttribute('data-src');
                        } else src = x.getAttribute('src');
                        p.style['backgroundImage'] = 'url(\'' + src + '\')';
                        p.style['backgroundSize'] = 'cover';
                        p.style['backgroundPosition'] = 'center';
                        p.style['backgroundRepeat'] = 'no-repeat';
                        x.style['opacity'] = '0';
                    }
                })();
            }(function() {
                var items = $$('.deferred'),
                    f;
                if (!('forEach' in NodeList.prototype)) NodeList.prototype.forEach = Array.prototype.forEach;
                items.forEach(function(p) {
                    var i = p.firstElementChild;
                    p.style.backgroundImage = 'url(' + i.src + ')';
                    p.style.backgroundSize = '100% 100%';
                    p.style.backgroundPosition = 'top left';
                    p.style.backgroundRepeat = 'no-repeat';
                    i.style.opacity = 0;
                    i.style.transition = 'opacity 0.375s ease-in-out';
                    i.addEventListener('load', function(event) {
                        if (i.dataset.src !== 'done') return;
                        if (Date.now() - i._startLoad < 375) {
                            p.classList.remove('loading');
                            p.style.backgroundImage = 'none';
                            i.style.transition = '';
                            i.style.opacity = 1;
                        } else {
                            p.classList.remove('loading');
                            i.style.opacity = 1;
                            setTimeout(function() {
                                p.style.backgroundImage = 'none';
                            }, 375);
                        }
                    });
                });
                f = function() {
                    var height = document.documentElement.clientHeight,
                        top = (client.os == 'ios' ? document.body.scrollTop : document.documentElement.scrollTop),
                        bottom = top + height;
                    items.forEach(function(p) {
                        var i = p.firstElementChild;
                        if (i.offsetParent === null) return true;
                        if (i.dataset.src === 'done') return true;
                        var x = i.getBoundingClientRect(),
                            imageTop = top + Math.floor(x.top) - height,
                            imageBottom = top + Math.ceil(x.bottom) + height,
                            src;
                        if (imageTop <= bottom && imageBottom >= top) {
                            src = i.dataset.src;
                            i.dataset.src = 'done';
                            p.classList.add('loading');
                            i._startLoad = Date.now();
                            i.src = src;
                        }
                    });
                };
                on('load', f);
                on('resize', f);
                on('scroll', f);
            })();

            function form(id, settings) {
                var _this = this;
                this.id = id;
                this.mode = settings.mode;
                this.method = settings.method;
                this.success = settings.success;
                this.initHandler = ('initHandler' in settings ? settings.initHandler : null);
                this.presubmitHandler = ('presubmitHandler' in settings ? settings.presubmitHandler : null);
                this.failure = ('failure' in settings ? settings.failure : null);
                this.optional = ('optional' in settings ? settings.optional : []);
                this.events = ('events' in settings ? settings.events : {});
                this.$form = $('#' + this.id);
                this.$form.addEventListener('change', function(event) {
                    if (event.target.tagName != 'INPUT') return;
                    _this.refreshInput(event.target);
                });
                this.$form.addEventListener('submit', function(event) {
                    _this.submit(event);
                });
                this.$form.addEventListener('keydown', function(event) {
                    if (event.keyCode == 13 && event.ctrlKey) {
                        event.preventDefault();
                        event.stopPropagation();
                        _this.submit(event);
                    }
                });
                var x = $('#' + this.id + ' input[name="' + settings.hid + '"]');
                if (x) {
                    x.disabled = true;
                    x.parentNode.style.display = 'none';
                }
                this.$submit = $('#' + this.id + ' button[type="submit"]');
                this.$submit.disabled = false;
                this.initInputs();
                if (this.initHandler) {
                    errors.handle(function(message) {
                        return _this.failureHandler(message);
                    });
                    if (!this.initHandler()) errors.unhandle();
                }
            };
            form.prototype.refreshInput = function(input) {
                var a = [],
                    p;
                switch (input.type) {
                    case 'file':
                        p = input.parentNode;
                        if (input.files.length > 0) p.setAttribute('data-filename', input.files[0].name);
                        else p.setAttribute('data-filename', '');
                        break;
                    default:
                        break;
                }
            };
            form.prototype.refreshInputs = function() {
                var i;
                for (i = 0; i < this.$form.elements.length; i++) this.refreshInput(this.$form.elements[i]);
            };
            form.prototype.initInputs = function() {
                var i, input;
                for (i = 0; i < this.$form.elements.length; i++) {
                    input = this.$form.elements[i];
                    switch (input.type) {
                        case 'file':
                            input.addEventListener('focus', function(event) {
                                event.target.parentNode.classList.add('focus');
                            });
                            input.addEventListener('blur', function(event) {
                                event.target.parentNode.classList.remove('focus');
                            });
                            break;
                        case 'text':
                        case 'textarea':
                        case 'email':
                            input.addEventListener('blur', function(event) {
                                this.value = this.value.replace(/^\s+/, '').replace(/\s+$/, '');
                            });
                            break;
                    }
                    this.refreshInput(input);
                }
            };
            form.prototype.notify = function(type, message) {
                if (message.match(/^(#[a-zA-Z0-9\_\-]+|[a-z0-9\-\.]+:[a-zA-Z0-9\~\!\@\#$\%\&\-\_\+\=\;\,\.\?\/\:]+)$/)) location.href = message;
                else alert((type == 'failure' ? 'Error: ' : '') + message);
            };
            form.prototype.getRequiredInputValue = function(name, type) {
                var k, $f, $ff;
                $ff = this.$form.elements;
                for (k in $ff) {
                    $f = $ff[k];
                    if ($f.type == type && $f.name == name && $f.value !== '' && $f.value !== null) return $f.value;
                }
                return null;
            };
            form.prototype.getEmail = function() {
                return this.getRequiredInputValue('email', 'email');
            };
            form.prototype.getAmount = function() {
                var x;
                x = this.getRequiredInputValue('amount', 'select-one');
                if (!x) return null;
                x = parseFloat(x);
                if (isNaN(x) || x < 1.00 || x > 100000.00) return null;
                return x;
            };
            form.prototype.values = function() {
                var a = {};
                for (i in this.$form.elements) {
                    e = this.$form.elements[i];
                    if (!e.name || !e.value) continue;
                    switch (e.type) {
                        case 'checkbox':
                            a[e.name] = (e.checked ? 'checked' : null);
                            break;
                        case 'file':
                            a[e.name] = {
                                name: e.files[0].name,
                                blob: new Blob([e.files[0]], {
                                    type: e.files[0].type
                                })
                            };
                            break;
                        default:
                            a[e.name] = e.value;
                            break;
                    }
                }
                a['id'] = this.id;
                return a;
            };
            form.prototype.scrollIntoView = function() {
                window.scrollTo(0, this.$form.offsetTop);
            };
            form.prototype.submit = function(event) {
                var _this = this,
                    result, handler, a, i, e, fd, k, x, $f, $ff;
                event.preventDefault();
                if (this.$submit.disabled) return;
                result = true;
                $ff = this.$form.elements;
                for (k in $ff) {
                    $f = $ff[k];
                    if ($f.type != 'text' && $f.type != 'email' && $f.type != 'textarea' && $f.type != 'select-one' && $f.type != 'checkbox' && $f.type != 'file' && $f.type != 'hidden') continue;
                    if ($f.disabled) continue;
                    if ($f.type == 'text' || $f.type == 'email' || $f.type == 'textarea' || $f.type == 'hidden') $f.value = $f.value.replace(/^\s+/, '').replace(/\s+$/, '');
                    if ($f.value === '' || $f.value === null || ($f.type == 'checkbox' && !$f.checked)) {
                        if (this.optional.indexOf($f.name) !== -1) continue;
                        result = false;
                    } else {
                        switch ($f.type) {
                            case 'email':
                                result = result && $f.value.match(new RegExp("^([a-zA-Z0-9\\_\\-\\.\\+]+)@([a-zA-Z0-9\\-\\.]+)\\.([a-zA-Z]+)$"));
                                break;
                            case 'select-one':
                                result = result && $f.value.match(new RegExp("^[^\\<\\>]+$"));
                                break;
                            case 'checkbox':
                                result = result && $f.checked && ($f.value == 'checked');
                                break;
                            case 'file':
                                break;
                            default:
                            case 'text':
                            case 'textarea':
                            case 'hidden':
                                result = result && $f.value.match(new RegExp("^[^\\<\\>]+$"));
                                break;
                        }
                    }
                    if (!result) break;
                }
                if (!result) {
                    this.notify('failure', 'Missing or invalid fields. Please try again.');
                    return;
                }
                if ('onsubmit' in _this.events) _this.events.onsubmit.apply(this.$form);
                switch (_this.method) {
                    case 'none':
                        return;
                    case 'get':
                    case 'post':
                        _this.$form.submit();
                        return;
                    default:
                    case 'ajax':
                        break;
                }
                if (x = $(':focus')) x.blur();
                errors.handle(function(message) {
                    return _this.failureHandler(message);
                });
                a = this.values();
                if (this.presubmitHandler) this.presubmitHandler.call(this, a);
                else this.submitHandler(a);
            };
            form.prototype.submitHandler = function(values) {
                var _this = this,
                    x, k, data;
                this.waiting(true);
                data = new FormData;
                for (k in values) {
                    if (values[k] && typeof values[k] == 'object' && ('blob' in values[k])) data.append(k, values[k].blob, values[k].name);
                    else data.append(k, values[k]);
                }
                x = new XMLHttpRequest();
                x.open('POST', ['', 'post', this.mode].join('/'));
                x.send(data);
                x.onreadystatechange = function() {
                    var o;
                    if (x.readyState != 4) return;
                    if (x.status != 200) throw new Error('Failed server response (' + x.status + ')');
                    try {
                        o = JSON.parse(x.responseText);
                    } catch (e) {
                        throw new Error('Invalid server response');
                    }
                    if (!('result' in o) || !('message' in o)) throw new Error('Incomplete server response');
                    if (o.result !== true) throw new Error(o.message);
                    if ('onsuccess' in _this.events) _this.events.onsuccess.apply(this.$form);
                    _this.$form.reset();
                    _this.refreshInputs();
                    _this.notify('success', (_this.success ? _this.success : o.message));
                    _this.waiting(false);
                    errors.unhandle();
                };
            };
            form.prototype.failureHandler = function(message) {
                console.log('failed (' + message + ')');
                if ('onfailure' in this.events) this.events.onfailure.apply(this.$form);
                if (message.match(/ALERT:/)) window.alert(message.substring(message.indexOf('ALERT:') + 7));
                else this.notify('failure', (this.failure ? this.failure : message));
                this.waiting(false);
                errors.unhandle();
                return true;
            };
            form.prototype.waiting = function(x) {
                if (x) {
                    $body.classList.add('is-instant');
                    this.$submit.disabled = true;
                    this.$submit.classList.add('waiting');
                } else {
                    $body.classList.remove('is-instant');
                    this.$submit.classList.remove('waiting');
                    this.$submit.disabled = false;
                }
            };
            form.prototype.pause = function(values, handler) {
                var _this = this;
                this.waiting(true);
                db.open('formData', function(objectStore) {
                    db.delete(objectStore, _this.id, function() {
                        db.put(objectStore, values, function() {
                            handler.call(_this);
                        });
                    });
                });
            };
            form.prototype.resume = function(handler) {
                var _this = this;
                this.waiting(true);
                this.scrollIntoView();
                db.open('formData', function(objectStore) {
                    db.get(objectStore, _this.id, function(values) {
                        db.delete(objectStore, _this.id, function() {
                            var e, i, v;
                            for (i in _this.$form.elements) {
                                e = _this.$form.elements[i];
                                if (!e.name) continue;
                                v = (e.name in values ? values[e.name] : null);
                                switch (e.type) {
                                    case 'checkbox':
                                        e.checked = (v == 'checked' ? true : false);
                                        break;
                                    case 'file':
                                        if (v) e.parentNode.setAttribute('data-filename', v.name);
                                        break;
                                    default:
                                        e.value = v;
                                        break;
                                }
                            }
                            handler.call(_this, values);
                        });
                    });
                });
            };
            new form('form02', {
                mode: 'contact',
                method: 'ajax',
                hid: 'data-url',
                success: '#contact-done',
            });
        })();