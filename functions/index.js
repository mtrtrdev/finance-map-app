// functions/index.js の一番最初の行に追加
// 開発環境 (ローカル) のみで .env ファイルを読み込む
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const functions = require("firebase-functions"); // v1 APIのfunctionsオブジェクト
const admin = require("firebase-admin");
const alphaVantage = require("./alphaVantage");

// Admin SDK の初期化
if (!admin.apps.length) {
  admin.initializeApp();
}

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_KEY;

// v1 APIでは setGlobalOptions は直接使用できないか、関数ごとに functions.runWith を使用
// ここでは一旦 setGlobalOptions を削除またはコメントアウト
// const {setGlobalOptions} = require("firebase-functions");
// const {onRequest} = require("firebase-functions/https"); // v2 APIのonRequestは不要
// const {onSchedule} = require("firebase-functions/v2/pubsub"); // v2 APIのonScheduleは不要
const logger = require("firebase-functions/logger"); // v2 APIのloggerはそのまま使用可能 (推奨)

// setGlobalOptions({ maxInstances: 10 }); // この行を削除またはコメントアウト

const FANG_PLUS_SYMBOLS = ["AAPL", "AMZN", "META", "GOOGL", "NFLX"];

function calculateChangePercentage(current, past) {
  if (past === 0 || isNaN(past) || !isFinite(past)) {
    return 0;
  }
  return ((current - past) / past) * 100;
}

/**
 * 主要な株価データ更新関数。
 * Alpha Vantage APIからデータを取得し、計算、Firestoreに保存する。
 * HTTPトリガーとしても残しておき、必要に応じて手動実行も可能にする。
 * (v1 API形式)
 */
exports.updateStockDataHttp = functions.https.onRequest(async (req, res) => { // v1 API形式に変更
  if (!ALPHA_VANTAGE_API_KEY) {
    logger.error("Alpha Vantage API Key is not set.", { structuredData: true });
    return res.status(500).send("API Key is missing. Please set ALPHA_VANTAGE_KEY.");
  }

  logger.info("Stock data update initiated via HTTP trigger.", { structuredData: true });

  const db = admin.firestore();
  const batch = db.batch();

  for (const symbol of FANG_PLUS_SYMBOLS) {
    try {
      logger.info(`Fetching data for ${symbol}...`, { structuredData: true, symbol: symbol });
      const apiResponse = await alphaVantage.getDailyTimeSeries(symbol);
      const parsedData = alphaVantage.parseDailyTimeSeries(apiResponse);

      const {
        currentPrice,
        todayOpenPrice,
        oneDayAgoPrice,
        oneWeekAgoPrice,
        oneMonthAgoPrice,
        ytdPrice
      } = parsedData;

      const changeToday = calculateChangePercentage(currentPrice, todayOpenPrice);
      const change1d = calculateChangePercentage(currentPrice, oneDayAgoPrice);
      const change1w = calculateChangePercentage(currentPrice, oneWeekAgoPrice);
      const change1m = calculateChangePercentage(currentPrice, oneMonthAgoPrice);
      const changeYTD = calculateChangePercentage(currentPrice, ytdPrice);

      const stockRef = db.collection("stocks").doc(symbol);
      const updateData = {
        symbol: symbol,
        name: apiResponse["Meta Data"]["2. Symbol"] ? apiResponse["Meta Data"]["2. Symbol"].split(" ")[0] : symbol,
        lastPrice: currentPrice,
        changeToday: parseFloat(changeToday.toFixed(2)),
        change1d: parseFloat(change1d.toFixed(2)),
        change1w: parseFloat(change1w.toFixed(2)),
        change1m: parseFloat(change1m.toFixed(2)),
        changeYTD: parseFloat(changeYTD.toFixed(2)),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      batch.set(stockRef, updateData, { merge: true });

      logger.info(`Calculated data for ${symbol}:`, { structuredData: true, symbol: symbol, data: updateData });
    } catch (error) {
      logger.error(`Failed to process data for ${symbol}:`, error, { structuredData: true, symbol: symbol });
    }
  }

  try {
    await batch.commit();
    logger.info("All stock data updated successfully in Firestore.", { structuredData: true });
    res.status(200).send("Stock data update process completed.");
  } catch (batchError) {
    logger.error("Error committing Firestore batch:", batchError, { structuredData: true });
    res.status(500).send(`Error committing stock data to Firestore: ${batchError.message}`);
  }
});

// 既存の testAlphaVantage 関数も v1 API形式に変更
exports.testAlphaVantage = functions.https.onRequest(async (req, res) => { // v1 API形式に変更
  const symbol = req.query.symbol || "IBM";

  if (!ALPHA_VANTAGE_API_KEY) {
    logger.error("Alpha Vantage API Key is not set in environment variables.", { structuredData: true });
    return res.status(500).send("API Key is missing. Please set ALPHA_VANTAGE_KEY in .env or Firebase environment variables.");
  }

  try {
    const data = await alphaVantage.getDailyTimeSeries(symbol.toUpperCase());
    logger.info(`Successfully fetched data for ${symbol}`, { structuredData: true, symbol: symbol });
    res.status(200).json({ message: `Successfully fetched data for ${symbol}`, data: data });
  } catch (error) {
    logger.error(`Error in testAlphaVantage for ${symbol}:`, error, { structuredData: true, symbol: symbol });
    res.status(500).send(`Failed to fetch data: ${error.message}`);
  }
});

// スケジュールトリガー関数は削除済みのため、ここでは追加しない
