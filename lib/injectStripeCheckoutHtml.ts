/**
 * Appends a fixed Stripe checkout control to generated static HTML when the owner has Stripe connected.
 */
export function injectStripeCheckoutHtml(
  html: string,
  opts: { slug: string; buttonText: string; siteOrigin: string }
): string {
  const origin = opts.siteOrigin.replace(/\/$/, "");
  const slugJson = JSON.stringify(opts.slug);
  const safeBtn = opts.buttonText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/"/g, "&quot;");

  const snippet = `
<div id="lacore-stripe-fab" style="position:fixed;bottom:20px;left:20px;z-index:2147483647;font-family:system-ui,sans-serif;">
<button type="button" id="lacore-stripe-pay-btn" style="border:none;background:#6366f1;color:#fff;border-radius:6px;padding:14px 22px;font-size:13px;font-weight:800;letter-spacing:0.06em;cursor:pointer;box-shadow:0 12px 40px rgba(0,0,0,0.35);">${safeBtn}</button>
</div>
<script>
(function(){
  var b=document.getElementById('lacore-stripe-pay-btn');
  if(!b)return;
  b.addEventListener('click',function(){
    fetch(${JSON.stringify(`${origin}/api/stripe/checkout`)},{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:${slugJson}})})
      .then(function(r){return r.json();})
      .then(function(j){
        if(j.checkout_url){window.location.href=j.checkout_url;}
        else if(j.error){alert(j.error);}
      }).catch(function(){alert('Checkout failed');});
  });
})();
</script>`;

  const trimmed = html.trim();
  if (/<\/body>/i.test(trimmed)) {
    return trimmed.replace(/<\/body>/i, `${snippet}</body>`);
  }
  return `${trimmed}${snippet}`;
}
