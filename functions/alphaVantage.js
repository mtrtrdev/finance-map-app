// const functions = require('firebase-functions'); // この行を削除またはコメントアウト
const axios = require("axios");
const moment = require("moment-timezone");

const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_KEY;
const BASE_URL = "https://www.alphavantage.co/query";

/**
 * Alpha Vantage APIから指定された銘柄の最新の日次時系列データを取得する
 * @param {string} symbol - 銘柄シンボル (例: "AAPL")
 * @return {Promise<object>} APIレスポンスのJSONデータ
 */
async function getDailyTimeSeries(symbol) {
  if (!ALPHA_VANTAGE_API_KEY) {
    throw new Error("Alpha Vantage API Key is not set in environment variables.");
  }

  try {
    const response = await axios.get(BASE_URL, {
      params: {
        function: "TIME_SERIES_DAILY",
        symbol: symbol,
        apikey: ALPHA_VANTAGE_API_KEY,
        outputsize: "full"
      }
    });

    if (response.data["Note"]) {
      console.warn(`Alpha Vantage API Note for ${symbol}: ${response.data["Note"]}`);
      throw new Error(`Alpha Vantage API rate limit or other issue: ${response.data["Note"]}`);
    }
    if (response.data["Error Message"]) {
      console.error(`Alpha Vantage API Error for ${symbol}: ${response.data["Error Message"]}`);
      throw new Error(`Alpha Vantage API Error: ${response.data["Error Message"]}`);
    }

    return response.data;
  } catch (error) {
    console.error(`Error fetching data for ${symbol} from Alpha Vantage API:`, error.message);
    throw error;
  }
}

/**
 * Alpha Vantage の日次時系列データから、指定された日付のデータを取得するヘルパー関数
 * @param {object} timeSeries - APIレスポンスの "Time Series (Daily)" オブジェクト
 * @param {string} dateString - YYYY-MM-DD 形式の日付文字列
 * @returns {object|null} 指定された日付のデータ、またはnull
 */
// function getDataForDate(timeSeries, dateString) { // この関数は使用されていないので削除またはコメントアウト
//   return timeSeries[dateString] || null;
// }

/**
 * Alpha Vantage の日次時系列データから、変動率計算に必要なデータを抽出する。
 * @param {object} apiResponse - Alpha Vantage API (TIME_SERIES_DAILY) のレスポンスデータ
 * @return {object} 抽出された株価データを含むオブジェクト
 */
function parseDailyTimeSeries(apiResponse) {
  const timeSeries = apiResponse["Time Series (Daily)"];
  if (!timeSeries) {
    throw new Error("Invalid Alpha Vantage API response: \"Time Series (Daily)\" data missing.");
  }

  const sortedDates = Object.keys(timeSeries).sort().reverse();
  if (sortedDates.length === 0) {
    throw new Error("No daily time series data found in API response.");
  }

  const latestDate = sortedDates[0];
  const latestData = timeSeries[latestDate];

  const currentPrice = parseFloat(latestData["4. close"]);
  const todayOpenPrice = parseFloat(latestData["1. open"]);

  const oneDayAgoDate = sortedDates[1];
  const oneDayAgoPrice = oneDayAgoDate ? parseFloat(timeSeries[oneDayAgoDate]["4. close"]) : currentPrice;

  let oneWeekAgoPrice = currentPrice;
  const weekAgoMoment = moment.tz(latestDate, "YYYY-MM-DD", "America/New_York");
  let count = 0;
  for (let i = 0; i < sortedDates.length; i++) {
    const currentDate = sortedDates[i];
    const diffDays = weekAgoMoment.diff(moment.tz(currentDate, "YYYY-MM-DD", "America/New_York"), "days");
    if (diffDays >= 7 && count < 5) {
      oneWeekAgoPrice = parseFloat(timeSeries[currentDate]["4. close"]);
      break;
    }
    if (i > 5 && (moment.tz(latestDate, "YYYY-MM-DD", "America/New_York").diff(moment.tz(currentDate, "YYYY-MM-DD", "America/New_York"), "days") > 10)) {
      break;
    }
    count++;
  }

  let oneMonthAgoPrice = currentPrice;
  const monthAgoMoment = moment.tz(latestDate, "YYYY-MM-DD", "America/New_York").subtract(1, "month");
  for (const date of sortedDates) {
    const dataMoment = moment.tz(date, "YYYY-MM-DD", "America/New_York");
    if (dataMoment.isSameOrBefore(monthAgoMoment, "day")) {
      oneMonthAgoPrice = parseFloat(timeSeries[date]["4. close"]);
      break;
    }
  }

  let ytdPrice = currentPrice;
  const yearStartMoment = moment.tz(latestDate, "YYYY-MM-DD", "America/New_York").startOf("year");
  for (const date of sortedDates) {
    const dataMoment = moment.tz(date, "YYYY-MM-DD", "America/New_York");
    if (dataMoment.isSameOrAfter(yearStartMoment, "day")) {
      ytdPrice = parseFloat(timeSeries[date]["4. close"]);
    } else {
      break;
    }
  }

  return {
    currentPrice,
    todayOpenPrice,
    oneDayAgoPrice,
    oneWeekAgoPrice,
    oneMonthAgoPrice,
    ytdPrice,
    latestUpdateTime: latestDate
  };
}

module.exports = {
  getDailyTimeSeries,
  parseDailyTimeSeries
};
