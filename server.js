require("dotenv").config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

const uri = process.env.MONGO_URI || "mongodb+srv://UserNameDB:UserNameDB@cluster.mongodb.net/cosmetics_shop";
const client = new MongoClient(uri);

let database;

client.connect()
  .then(() => {
    console.log("Conexiune reușită la MongoDB Atlas!");
    database = client.db("cosmetics_shop");
  })
  .catch(err => console.error("Eroare la conectare:", err));

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Autentificare necesară." });
  }

  try {
    const decoded = jwt.verify(token, "secretKey");
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ message: "Token invalid." });
  }
}

app.get("/products", async (req, res) => {
  try {
    const products = await database.collection("products").find().toArray();
    res.json(products);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await database.collection("customers").findOne({ email });

    if (!customer) {
      return res.status(404).json({ message: "Utilizatorul nu a fost găsit." });
    }

    const isValid = await bcrypt.compare(password, customer.password);

    if (!isValid) {
      return res.status(401).json({ message: "Parola este incorectă." });
    }

    const token = jwt.sign({ id: customer._id, email: customer.email }, "secretKey", { expiresIn: "1h" });

    res.json({ message: "Autentificare reușită!", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    const existingCustomer = await database.collection("customers").findOne({ email });

    if (existingCustomer) {
      return res.status(400).json({ message: "Email-ul este deja folosit." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newCustomer = { name, email, password: hashedPassword, phone, address, cart: [], orders: [] };

    const result = await database.collection("customers").insertOne(newCustomer);
    res.status(201).json({ message: "Utilizator creat cu succes!", customerId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/update-cart", authenticate, async (req, res) => {
  try {
    const { cart } = req.body;

    if (!Array.isArray(cart)) {
      return res.status(400).json({ message: "Coșul trebuie să fie o listă." });
    }

    const result = await database.collection("customers").updateOne(
      { _id: new ObjectId(req.user.id) },
      { $set: { cart } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Utilizatorul nu a fost găsit." });
    }

    res.json({ message: "Coșul a fost actualizat cu succes." });
  } catch (err) {
    console.error("Eroare la actualizarea coșului:", err);
    res.status(500).json({ message: "A apărut o eroare." });
  }
});

app.post("/place-order", authenticate, async (req, res) => {
  try {
    const { items } = req.body;

    const customer = await database.collection("customers").findOne({ _id: new ObjectId(req.user.id) });

    if (!customer) {
      return res.status(404).json({ message: "Clientul nu a fost găsit." });
    }

    const productIds = items.map(item => new ObjectId(item.productId));
    const products = await database.collection("products").find({ _id: { $in: productIds } }).toArray();

    let total = 0;
    const orderProducts = items.map(item => {
      const product = products.find(p => p._id.toString() === item.productId);
      if (!product || product.stock < item.quantity) {
        throw new Error(`Produsul ${item.productId} nu este disponibil în cantitatea dorită.`);
      }
      total += product.price * item.quantity;
      return { product_id: product._id, name: product.name, price: product.price, quantity: item.quantity };
    });

    const order = { customer_id: customer._id, products: orderProducts, total, status: "Plasată", order_date: new Date() };
    const orderResult = await database.collection("orders").insertOne(order);

    await database.collection("customers").updateOne(
      { _id: customer._id },
      { $set: { cart: [] }, $push: { orders: orderResult.insertedId } }
    );

    for (const item of items) {
      await database.collection("products").updateOne(
        { _id: new ObjectId(item.productId) },
        { $inc: { stock: -item.quantity } }
      );
    }

    res.json({ message: "Comanda a fost plasată cu succes!", orderId: orderResult.insertedId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/orders", authenticate, async (req, res) => {
  try {
    const orders = await database.collection("orders").find({ customer_id: new ObjectId(req.user.id) }).toArray();
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serverul rulează pe http://localhost:${PORT}`);
});
