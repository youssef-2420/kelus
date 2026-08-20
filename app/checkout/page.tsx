"use client";

import { useState } from "react";
import { KelusHeader } from "@/components/KelusHeader";
import { Icon } from "@/components/Icon";
import { ProductMark } from "@/components/ProductMark";
import Link from "next/link";

const methods = ["Card", "Google Pay", "Apple Pay", "PayPal"];
function PaymentMark({ method, large = false }: { method: string; large?: boolean }) {
  const size = large ? " payment-mark-large" : "";
  if (method === "Card") return <span className={'payment-mark card-mark' + size}>▭</span>;
  if (method === "Google Pay") return <span className={'payment-mark google-mark' + size}>G</span>;
  if (method === "Apple Pay") return <span className={'payment-mark apple-mark' + size}><b>Pay</b></span>;
  return <span className={'payment-mark paypal-mark' + size}><i>P</i><b>P</b></span>;
}
export default function CheckoutPage() {
  const [method, setMethod] = useState("Card");
  const [complete, setComplete] = useState(false);
  return <main className="app-page"><KelusHeader/><section className="checkout-page section"><div className="checkout-main">{complete ? <div className="checkout-complete"><span><Icon name="check" size={28}/></span><p className="eyebrow">Order ready</p><h1>Your demo order is confirmed.</h1><p>No payment was taken. In a live launch, this step would securely hand off to a payment provider.</p><Link className="button button-primary" href="/saved">Track the price instead <Icon name="arrow" size={18}/></Link></div> : <><Link className="crumb" href="/compare/iphone-17">← Back to comparison</Link><p className="eyebrow">Secure checkout</p><h1>Choose how you want to pay.</h1><p className="checkout-intro">Your payment information is encrypted in a live integration. This checkout is a safe product demo — do not enter real card details.</p><div className="payment-methods" role="tablist" aria-label="Payment method">{methods.map((item) => <button type="button" role="tab" aria-selected={method === item} className={method === item ? "active" : ""} onClick={() => setMethod(item)} key={item}><PaymentMark method={item}/><span>{item}</span></button>)}</div>{method === "Card" ? <form className="payment-form" onSubmit={(event) => { event.preventDefault(); setComplete(true); }}><h2>Card details</h2><label>Name on card<input required autoComplete="cc-name" placeholder="Name on card"/></label><label>Card number<input required inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000"/></label><div className="card-split"><label>Expiry date<input required autoComplete="cc-exp" placeholder="MM / YY"/></label><label>Security code<input required inputMode="numeric" autoComplete="cc-csc" placeholder="CVV"/></label></div><label className="check-row"><input type="checkbox"/> Billing address is the same as delivery address</label><button className="button button-primary pay-button" type="submit">Confirm and pay $799 <Icon name="lock" size={16}/></button></form> : <div className="express-payment"><PaymentMark method={method} large/><h2>Continue with {method}</h2><p>You’ll be redirected to {method} to complete payment in a live checkout.</p><button className="button button-primary" type="button" onClick={() => setComplete(true)}>Continue securely <Icon name="arrow" size={17}/></button></div>}</>}</div><aside className="checkout-summary"><p className="eyebrow">Order summary</p><div className="checkout-product"><ProductMark/><div><h2>iPhone 17</h2><p>256GB · New · Unlocked</p><span>Amazon · Kelus Pick</span></div></div><div className="summary-lines"><p><span>Item price</span><b>$799</b></p><p><span>Delivery</span><b>Free</b></p><p><span>Estimated tax</span><b>$0</b></p><p className="summary-total"><span>Total</span><strong>$799</strong></p></div><div className="checkout-assurance"><Icon name="shield" size={18}/><p><b>Protected purchase</b>Compare price, protection, returns, and seller confidence before you buy.</p></div></aside></section></main>;
}
