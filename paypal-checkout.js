/* MeerFollowers.nl – Inline PayPal Checkout v2 */
(function () {
    'use strict';

    var platform = (document.body.dataset.platform || 'instagram').toLowerCase();

    var fieldConfig = {
        instagram: [
            { name: 'gebruikersnaam', label: 'Jouw Instagram gebruikersnaam', placeholder: '@jouwgebruikersnaam', hint: 'Je account moet openbaar zijn tijdens de levering' }
        ],
        tiktok: [
            { name: 'gebruikersnaam', label: 'Jouw TikTok gebruikersnaam', placeholder: '@jouwgebruikersnaam', hint: 'Je account moet openbaar zijn tijdens de levering' }
        ],
        youtube: [
            { name: 'kanaalnaam', label: 'YouTube kanaalnaam', placeholder: 'Bijv. MijnYouTubeKanaal', hint: 'De naam zoals zichtbaar op jouw kanaal' },
            { name: 'kanaal_url', label: 'YouTube kanaal URL', placeholder: 'https://youtube.com/@jouwkanaal', hint: 'Volledige URL van jouw YouTube kanaal of video' }
        ],
        twitch: [
            { name: 'gebruikersnaam', label: 'Jouw Twitch gebruikersnaam', placeholder: 'jouwgebruikersnaam', hint: 'Jouw Twitch-kanaal moet live zijn tijdens de levering' }
        ]
    };

    var fields = fieldConfig[platform] || fieldConfig.instagram;
    var selectedAmount = '0.00';
    var selectedDesc   = '';
    var customerInfo   = {};

    // Collect packages from existing pricing-card data
    var packages = [];
    document.querySelectorAll('.paypal-card-btn').forEach(function (el) {
        var card = el.closest('.pricing-card');
        packages.push({
            amount:  el.getAttribute('data-amount'),
            desc:    el.getAttribute('data-desc'),
            popular: card ? card.classList.contains('popular') : false,
            delivery: card && card.querySelector('.card-delivery')
                      ? card.querySelector('.card-delivery').textContent.trim()
                      : ''
        });
    });

    if (packages.length === 0) return;

    // Default: select popular package, else first
    var defaultIdx = 0;
    packages.forEach(function (p, i) { if (p.popular) defaultIdx = i; });
    selectedAmount = packages[defaultIdx].amount;
    selectedDesc   = packages[defaultIdx].desc;

    // Build package selector
    var pkgHtml = packages.map(function (pkg, i) {
        var priceStr = '€' + pkg.amount.replace('.', ',');
        var parts    = pkg.desc.split(' ');
        var qty      = parts[0];
        var type     = parts.slice(1).join(' ');
        var delivery = pkg.delivery.replace(/^\s*\S+\s*/, ''); // strip icon text
        return '<label class="pkg-option' + (i === defaultIdx ? ' selected' : '') + (pkg.popular ? ' pkg-popular' : '') + '">' +
            '<input type="radio" name="mf-package" value="' + i + '"' + (i === defaultIdx ? ' checked' : '') + '>' +
            (pkg.popular ? '<span class="pkg-pop-badge">🔥 Meest gekozen</span>' : '') +
            '<span class="pkg-left">' +
                '<span class="pkg-qty">' + qty + '</span>' +
                '<span class="pkg-type">' + type + '</span>' +
            '</span>' +
            '<span class="pkg-right">' +
                '<span class="pkg-price">' + priceStr + '</span>' +
                '<span class="pkg-delivery-label">' + (pkg.delivery || '') + '</span>' +
            '</span>' +
        '</label>';
    }).join('');

    // Build info fields
    var fieldsHtml = fields.map(function (f) {
        return '<div class="ic-field">' +
            '<label class="ic-label">' + f.label + ' <span class="ic-req">*</span></label>' +
            '<input type="text" name="' + f.name + '" class="ic-input" placeholder="' + f.placeholder + '" autocomplete="off">' +
            '<span class="ic-hint">' + f.hint + '</span>' +
        '</div>';
    }).join('');

    // Inject into target element
    var target = document.getElementById('inline-checkout-target');
    if (!target) return;

    target.innerHTML =
        '<div class="inline-checkout" id="inline-checkout">' +
            '<div class="ic-step-label"><span class="ic-step-num">1</span> Kies je pakket</div>' +
            '<div class="pkg-selector">' + pkgHtml + '</div>' +

            '<div class="ic-step-label" style="margin-top:1.5rem;"><span class="ic-step-num">2</span> Jouw gegevens</div>' +
            '<div class="ic-fields">' + fieldsHtml + '</div>' +

            '<div class="ic-step-label" style="margin-top:1.5rem;"><span class="ic-step-num">3</span> Veilig betalen</div>' +
            '<div id="ic-paypal-btn" style="margin-top:0.85rem;min-height:55px;"></div>' +

            '<div class="ic-trust">' +
                '<span><i class="fas fa-lock"></i> 256-bit SSL beveiligd</span>' +
                '<span><i class="fas fa-key"></i> Geen wachtwoord nodig</span>' +
                '<span><i class="fab fa-paypal"></i> Veilige PayPal/iDEAL betaling</span>' +
                '<span><i class="fas fa-redo"></i> 30 dagen refill garantie</span>' +
                '<span><i class="fas fa-bolt"></i> Levering binnen uren</span>' +
            '</div>' +
        '</div>';

    // Package change handler
    target.addEventListener('change', function (e) {
        if (e.target.name !== 'mf-package') return;
        var idx = parseInt(e.target.value, 10);
        var pkg = packages[idx];
        selectedAmount = pkg.amount;
        selectedDesc   = pkg.desc;
        target.querySelectorAll('.pkg-option').forEach(function (o) { o.classList.remove('selected'); });
        var label = e.target.closest('.pkg-option');
        if (label) label.classList.add('selected');
    });

    // Make pricing cards below scroll to inline checkout and pre-select
    document.querySelectorAll('.pricing-card').forEach(function (card, i) {
        var btn = card.querySelector('.paypal-card-btn');
        if (!btn) return;
        btn.innerHTML = '';
        var scrollBtn = document.createElement('button');
        scrollBtn.type      = 'button';
        scrollBtn.className = 'card-btn ic-card-btn';
        scrollBtn.innerHTML = '<i class="fab fa-paypal"></i> Betaal met PayPal';
        scrollBtn.addEventListener('click', function () {
            var radio = target.querySelectorAll('input[name="mf-package"]')[i];
            if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
            }
            var checkout = document.getElementById('inline-checkout');
            if (checkout) checkout.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        btn.appendChild(scrollBtn);
    });

    // Render PayPal button
    if (typeof paypal_sdk === 'undefined') return;

    paypal_sdk.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'buynow', height: 52 },

        onClick: function (data, actions) {
            var valid = true;
            customerInfo = {};
            target.querySelectorAll('.ic-input').forEach(function (input) {
                input.style.borderColor = '';
                input.style.boxShadow   = '';
                if (!input.value.trim()) {
                    input.style.borderColor = '#ef4444';
                    input.style.boxShadow   = '0 0 0 3px rgba(239,68,68,0.15)';
                    valid = false;
                } else {
                    input.style.borderColor = 'rgba(34,197,94,0.5)';
                    customerInfo[input.name] = input.value.trim();
                }
            });
            if (!valid) {
                var first = target.querySelector('.ic-input');
                if (first) first.focus();
                return actions.reject();
            }
            return actions.resolve();
        },

        createOrder: function (data, actions) {
            var infoStr = Object.values(customerInfo).join(' | ');
            return actions.order.create({
                purchase_units: [{
                    amount: { value: selectedAmount, currency_code: 'EUR' },
                    description: selectedDesc + ' | ' + infoStr + ' | MeerFollowers.nl'
                }]
            });
        },

        onApprove: function (data, actions) {
            return actions.order.capture().then(function (details) {
                var successEl = document.getElementById('paypal-success-product');
                if (successEl) successEl.textContent = selectedDesc;
                var infoEl = document.getElementById('paypal-success-info');
                if (infoEl) infoEl.textContent = Object.values(customerInfo).join(' • ');
                var modal = document.getElementById('paypal-success-modal');
                if (modal) modal.style.display = 'flex';
            });
        },

        onError: function (err) {
            console.error('PayPal error:', err);
            alert('Er is een fout opgetreden. Probeer het opnieuw of neem contact op via meerfollowersdesk@hotmail.com');
        }
    }).render('#ic-paypal-btn');

})();
