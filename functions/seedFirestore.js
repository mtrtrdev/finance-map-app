const admin = require("firebase-admin");
const path = require("path");

// サービスアカウントキーファイルのパスを指定
// ダウンロードしたJSONキーファイルを functions ディレクトリに配置した場合
const serviceAccountPath = path.resolve(__dirname, "serviceAccountKey.json");
// キーファイルが存在しない場合のエラーハンドリング
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (e) {
  console.error(`Error: サービスアカウントキーファイルが見つかりません。パスを確認してください: ${serviceAccountPath}`);
  console.error("Firebase Admin SDKの初期化に失敗しました。");
  process.exit(1); // スクリプトを終了
}


// Firebase Admin SDKの初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
    // projectId: serviceAccount.project_id, // サービスアカウントキーから自動で取得されるため、明示的な指定は不要な場合が多い
  });
}

const db = admin.firestore();

const stocksData = [
  {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "lastPrice": 173.45,
    "changeToday": 1.23,
    "change1d": 1.23,
    "change1w": 3.45,
    "change1m": 5.67,
    "changeYTD": 12.34,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp()
  },
  {
    "symbol": "AMZN",
    "name": "Amazon.com, Inc.",
    "lastPrice": 180.12,
    "changeToday": -0.56,
    "change1d": -0.56,
    "change1w": 1.20,
    "change1m": 4.00,
    "changeYTD": 15.00,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp()
  },
  {
    "symbol": "META",
    "name": "Meta Platforms, Inc.",
    "lastPrice": 280.50,
    "changeToday": 2.10,
    "change1d": 2.10,
    "change1w": 5.10,
    "change1m": 8.20,
    "changeYTD": 20.50,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp()
  },
  {
    "symbol": "GOOGL",
    "name": "Alphabet Inc. (Class A)",
    "lastPrice": 155.00,
    "changeToday": -1.00,
    "change1d": -1.00,
    "change1w": 0.50,
    "change1m": 3.00,
    "changeYTD": 10.00,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp()
  },
  {
    "symbol": "NFLX",
    "name": "Netflix, Inc.",
    "lastPrice": 600.00,
    "changeToday": 0.80,
    "change1d": 0.80,
    "change1w": 2.50,
    "change1m": 7.00,
    "changeYTD": 18.00,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp()
  },
  {
    "symbol": "MSFT",
    "name": "Microsoft Corporation",
    "lastPrice": 330.00,
    "changeToday": 1.10,
    "change1d": 1.10,
    "change1w": 3.00,
    "change1m": 6.50,
    "changeYTD": 14.00,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp()
  },
  {
    "symbol": "TSLA",
    "name": "Tesla, Inc.",
    "lastPrice": 250.00,
    "changeToday": -0.90,
    "change1d": -0.90,
    "change1w": 4.50,
    "change1m": 9.00,
    "changeYTD": 25.00,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp()
  },
  {
    "symbol": "NVDA",
    "name": "NVIDIA Corporation",
    "lastPrice": 450.00,
    "changeToday": 2.50,
    "change1d": 2.50,
    "change1w": 6.00,
    "change1m": 12.00,
    "changeYTD": 40.00,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp()
  },
  {
    "symbol": "SNOW",
    "name": "Snowflake Inc.",
    "lastPrice": 160.00,
    "changeToday": 1.50,
    "change1d": 1.50,
    "change1w": 2.80,
    "change1m": 5.00,
    "changeYTD": 8.00,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp()
  },
  {
    "symbol": "BABA",
    "name": "Alibaba Group Holding Limited",
    "lastPrice": 90.00,
    "changeToday": -0.40,
    "change1d": -0.40,
    "change1w": 1.10,
    "change1m": 3.50,
    "changeYTD": 6.00,
    "updatedAt": admin.firestore.FieldValue.serverTimestamp()
  }
];


async function seedData() {
  console.log("Firestoreに初期データを投入中...");
  for (const stock of stocksData) {
    try {
      await db.collection("stocks").doc(stock.symbol).set(stock);
      console.log(`Successfully added/updated stock: ${stock.symbol}`);
    } catch (error) {
      console.error(`Error adding/updating stock ${stock.symbol}:`, error);
      // エラーが発生しても処理を中断しない
    }
  }
  console.log("初期データの投入が完了しました。");
}

// スクリプトが直接 `node` コマンドで実行された場合にのみ seedData() を呼び出す
if (require.main === module) {
  seedData().catch(console.error);
}

// 外部から (例えば Cloud Functions から) この関数を呼び出せるようにエクスポート
exports.seedData = seedData;
