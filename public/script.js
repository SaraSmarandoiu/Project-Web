const API_URL = "http://localhost:3000";
// array - stocheaza elementele din cos
let cart = []; 
//salveaza cosul din localStorage si trimite cerere in API pentru a actualiza cosul, folosind token-ul
async function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));

  const token = localStorage.getItem("token");
  if (!token) {
    return; 
  }

  try {
    const response = await fetch(`${API_URL}/update-cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ cart })
    });

    if (!response.ok) {
      console.error("Eroare la actualizarea coșului:", await response.text());
    }
  } catch (err) {
    console.error("Eroare de rețea la actualizarea coșului:", err);
  }
}

function loadCart() {
  const savedCart = localStorage.getItem("cart");
  if (savedCart) {
    cart = JSON.parse(savedCart);
  }
}

function updateCartCount() {
  const cartCount = document.getElementById("cart-count");
  if (cartCount) {
    cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  }
}

function addToCart(productId, name, price) {
  const existingItem = cart.find(item => item.productId === productId);

  if (existingItem) {
    existingItem.quantity++;
  } else {
    cart.push({ productId, name, price, quantity: 1 });
  }

  saveCart();
  updateCartCount();
}

function openCart() {
  window.location.href = "cart.html";
}

function renderCart() {
  const cartItemsDiv = document.getElementById("cart-items");
  const cartTotalSpan = document.getElementById("cart-total");

  if (!cartItemsDiv || !cartTotalSpan) return;

  if (cart.length === 0) {
    cartItemsDiv.innerHTML = "<p>Coșul este gol.</p>";
    cartTotalSpan.textContent = "0";
    return;
  }

  const cartHTML = cart.map(item => `
    <div class="cart-item">
      <p>${item.name} - ${item.quantity} x ${item.price} RON</p>
      <button onclick="removeFromCart('${item.productId}')">Șterge</button>
    </div>
  `).join('');

  cartItemsDiv.innerHTML = cartHTML;

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  cartTotalSpan.textContent = total.toFixed(2);
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.productId !== productId);
  saveCart();
  renderCart();
}

async function loadProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    const products = await response.json();

    const productList = document.getElementById("product-list");
    if (productList) {
      productList.innerHTML = products.map(product => `
        <div class="product-card" data-id="${product._id}">
          <img src="images/${product.images?.[0] || 'placeholder.jpg'}" alt="${product.name}">
          <h3>${product.name}</h3>
          <p>${product.description}</p>
          <p><strong>Preț: ${product.price} RON</strong></p>
          <button onclick="addToCart('${product._id}', '${product.name}', ${product.price})">Adaugă în coș</button>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error("Eroare la încărcarea produselor:", err);
  }
}

async function checkout() {
  if (cart.length === 0) {
    alert("Coșul este gol!");
    return;
  }

  const customer = {
    name: "Client Test",
    email: "client@example.com",
    phone: "0740123456",
    address: {
      street: "Strada Test",
      city: "București",
      zip: "010101"
    }
  };

  const items = cart.map(item => ({
    productId: item.productId,
    quantity: item.quantity
  }));

  try {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_URL}/place-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ customer, items })
    });

    const data = await response.json();

    if (response.ok) {
      alert(`Comanda a fost plasată cu succes! ID comandă: ${data.orderId}`);
      cart = [];
      saveCart();
      renderCart();
    } else {
      alert(`Eroare: ${data.message}`);
    }
  } catch (err) {
    console.error("Eroare la finalizarea comenzii:", err);
    alert("A apărut o eroare. Încearcă din nou.");
  }
}


function checkAuth() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Trebuie să fii autentificat pentru a accesa această pagină.");
    window.location.href = "login.html";
  }
}

function logout() {
  localStorage.removeItem("token");
  alert("Te-ai delogat cu succes!");
  window.location.href = "login.html";
}


if (window.location.pathname.endsWith("index.html")) {
  loadCart();
  updateCartCount();
  loadProducts();
}

if (window.location.pathname.endsWith("cart.html")) {
  checkAuth();
  loadCart();
  renderCart();
}
