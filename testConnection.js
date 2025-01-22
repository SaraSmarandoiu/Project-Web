const { MongoClient } = require("mongodb");

const uri = "mongodb+srv://UserNameDB:UserNameDB@cluster0.vuyc9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        console.log("Conexiune reușită la MongoDB Atlas!");
    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}
run();
