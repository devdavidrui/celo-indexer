import Transaction from '@models/transaction';
import { getAmountInUsd } from '@utils/helper';
import type { NextFunction, Request, Response } from 'express';
import { DateTime } from 'luxon';

export default class TransactionController {
  getAllTransactions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { flContractAddress, pairAddress, startDate, endDate } = req.query;
      let filter = {};
      if (flContractAddress) {
        filter = { flContractAddress, ...filter };
      }
      if (pairAddress) {
        filter = { pairAddress, ...filter };
      }
      if (startDate && endDate) {
        const startTimestamp = DateTime.fromSeconds(
          Number(startDate)
        ).toJSDate();
        const endTimestamp = DateTime.fromSeconds(Number(endDate)).toJSDate();
        filter = {
          ...filter,
          timestamp: { $gte: startTimestamp, $lte: endTimestamp },
        };
      }
      const transactions = await Transaction.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$txHash',
            tradeAmount: { $sum: '$amountOutUsd' },
            loanAmount: { $first: '$amountInUsd' },
            gasFees: { $first: '$gasFees' },
            tradeCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 1,
            tradeAmount: 1,
            loanAmount: 1,
            gasFees: 1,
            tradeCount: { $literal: 1 },
          },
        },
      ]);
      res.status(200).json({
        message: 'Transactions fetched successfully',
        data: transactions,
      });
    } catch (error) {
      next(error);
    }
  };

  findDuplicateTransactions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // await Transaction.deleteMany({
      //   flContractAddress: '0x2f399918581AbC119C1428a9422654FFeCCf5AC7',
      // })
      const startDate =
        DateTime.fromISO('2023-12-01T00:00:00Z').toMillis() / 1000;
      const endDate =
        DateTime.fromISO('2023-12-31T00:00:00Z').toMillis() / 1000;
      console.log('startDate', startDate);
      console.log('endDate', endDate);

      res.status(200).json({
        message: 'Transactions deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  getMonthlyStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      //2023
      const monthlyTimestamps = [
        // { startDate: 1698796800, endDate: 1701302400 }, // November 2023
        { startDate: 1701388800, endDate: 1703980800 }, // December 2023
      ];
      //2024
      // const monthlyTimestamps = [
      //   { startDate: 1704067200, endDate: 1706659200 }, // January 2024
      //   { startDate: 1706745600, endDate: 1709164800 }, // February 2024 (Leap year, 29 days)
      //   { startDate: 1709251200, endDate: 1711843200 }, // March 2024
      //   { startDate: 1711929600, endDate: 1714435200 }, // April 2024
      //   { startDate: 1714521600, endDate: 1717113600 }, // May 2024
      //   { startDate: 1717200000, endDate: 1719705600 }, // June 2024
      //   { startDate: 1719792000, endDate: 1722384000 }, // July 2024
      //   { startDate: 1722470400, endDate: 1725062400 }, // August 2024
      //   { startDate: 1725148800, endDate: 1727654400 }, // September 2024
      //   { startDate: 1727740800, endDate: 1730332800 }, // October 2024
      //   { startDate: 1730419200, endDate: 1732924800 }, // November 2024
      //   { startDate: 1733011200, endDate: 1735603200 }, // December 2024
      // ]

      //2025
      // const monthlyTimestamps = [
      //   { startDate: 1735689600, endDate: 1738281600 },
      //   { startDate: 1738368000, endDate: 1740700800 },
      //   { startDate: 1740787200, endDate: 1743379200 },
      //   { startDate: 1743465600, endDate: 1745971200 },
      //   { startDate: 1746057600, endDate: 1748649600 },
      //   { startDate: 1748736000, endDate: 1751241600 },
      // ]

      // const monthlyStats = []
      // let totalTradeAmount = 0
      // let totalGasFees = 0
      // let totalTradeCount = 0
      // for (const timestamp of monthlyTimestamps) {
      //   const startTimestamp = DateTime.fromSeconds(Number(timestamp.startDate)).toJSDate()
      //   const endTimestamp = DateTime.fromSeconds(Number(timestamp.endDate)).toJSDate()
      //   const transactions = await Transaction.aggregate([
      //     { $match: { timestamp: { $gte: startTimestamp, $lte: endTimestamp } } },
      //     {
      //       $group: {
      //         _id: '$txHash',
      //         tradeAmount: { $sum: '$amountOutUsd' },
      //         gasFees: { $first: '$gasFees' },
      //         tradeCount: { $sum: 1 },
      //       },
      //     },
      //     {
      //       $project: {
      //         _id: 1,
      //         tradeAmount: 1,
      //         gasFees: 1,
      //         tradeCount: { $literal: 1 },
      //       },
      //     },
      //   ])
      //   const txs = transactions.reduce((acc, tx) => {
      //     let tradeAmount = 0
      //     let gasFees = 0
      //     let tradeCount = 0
      //     tradeAmount = acc.tradeAmount + tx.tradeAmount
      //     gasFees = acc.gasFees + tx.gasFees
      //     tradeCount = acc.tradeCount + tx.tradeCount
      //     return {
      //       tradeAmount,
      //       gasFees,
      //       tradeCount,
      //     }
      //   })
      //   monthlyStats.push({
      //     startDate: DateTime.fromSeconds(timestamp.startDate).toFormat('yyyy-MM-dd'),
      //     endDate: DateTime.fromSeconds(timestamp.endDate).toFormat('yyyy-MM-dd'),
      //     tradeAmount: getAmountInUsd(txs.tradeAmount),
      //     gasFees: getAmountInUsd(txs.gasFees),
      //     tradeCount: txs.tradeCount,
      //   })
      //   totalTradeAmount += txs.tradeAmount
      //   totalGasFees += txs.gasFees
      //   totalTradeCount += txs.tradeCount
      // }
      // res.status(200).json({
      //   message: 'Monthly stats fetched successfully',
      //   data: {
      //     monthlyStats,
      //     totalGasFees: getAmountInUsd(totalGasFees),
      //     totalTradeCount,
      //     totalTradeAmount: getAmountInUsd(totalTradeAmount),
      //   },
      // })

      const data23 = {
        December: getAmountInUsd(27499116.669234965),
      };
      const data24 = {
        January: getAmountInUsd(41142763.22343335),
        Ferburary: getAmountInUsd(71740052.33318388),
        March: getAmountInUsd(155867618.39333233),
        April: getAmountInUsd(193664320.20296037),
        May: getAmountInUsd(214645660.82383096),
        June: getAmountInUsd(213089066.6250276),
        July: getAmountInUsd(268514418.7294441),
        August: getAmountInUsd(307993147.31477857),
        September: getAmountInUsd(334472189.3641786),
        October: getAmountInUsd(1138555450.6412075),
        November: getAmountInUsd(1560647212.149158),
        December: getAmountInUsd(1478720548.7262912),
        Total: getAmountInUsd(5979052448.526827),
      };

      const data25 = {
        January: getAmountInUsd(953376392.063781),
        February: getAmountInUsd(620568565.2799366),
        March: getAmountInUsd(202640267.67920184),
        April: getAmountInUsd(228291217.23039007),
        May: getAmountInUsd(212361615.70344242),
        June: getAmountInUsd(128177170.95976771),
        Total: getAmountInUsd(2345415228.91652),
      };
      res.status(200).json({
        message: 'Monthly stats fetched successfully',
        data23,
        data24,
        data25,
      });
    } catch (error) {
      next(error);
    }
  };
}
