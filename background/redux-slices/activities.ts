import { createSlice } from "@reduxjs/toolkit"
import Emittery from "emittery"
import dayjs from "dayjs"
import { convertToEth } from "../lib/utils"
import { AnyEVMTransaction } from "../types"

export type ActivityItem = AnyEVMTransaction & {
  timestamp?: number
  value: bigint
  from?: string
  isSent?: boolean
  detailRows: {
    [name: string]: {
      label: string
      value: any
      valueDetail: string
    }
  }
}

export type ActivitiesState = {
  [address: string]: {
    [hash: string]: ActivityItem
  }
}

export const initialState: ActivitiesState = {}

type KeyRenameAndPickMap<T> = {
  [P in keyof T]?: {
    readableName: string
    transformer: (value: T[P]) => string
    detailTransformer: (value: T[P]) => string
  }
}

const renameAndPickKeys = <T extends unknown>(
  keysMap: KeyRenameAndPickMap<T>,
  item: T
) =>
  // The as below is dicey but reasonable in our usage.
  Object.keys(item).reduce((previousValue, key) => {
    if (key in keysMap) {
      const knownKey = key as keyof KeyRenameAndPickMap<T> // guaranteed to be true by the `in` test
      return {
        ...previousValue,
        ...{
          [keysMap[knownKey].readableName]: keysMap[knownKey].transformer(
            item[knownKey]
          ),
        },
      }
    }
    return previousValue
  }, {})

function ethTransformer(value: string | number | bigint) {
  return `${convertToEth(value)} ETH`
}

const keysMap: KeyRenameAndPickMap<ActivityItem> = {
  blockHeight: {
    readableName: "Block Height",
    transformer: (item) => item.toString(),
    detailTransformer: () => {
      return ""
    },
  },
  value: {
    readableName: "Amount",
    transformer: ethTransformer,
    detailTransformer: ethTransformer,
  },
  gas: {
    readableName: "Gas",
    transformer: ethTransformer,
    detailTransformer: ethTransformer,
  },
  maxFeePerGas: {
    readableName: "Max Fee/Gas",
    transformer: ethTransformer,
    detailTransformer: ethTransformer,
  },
  gasPrice: {
    readableName: "Gas Price",
    transformer: ethTransformer,
    detailTransformer: ethTransformer,
  },
  timestamp: {
    readableName: "Timestamp",
    transformer: (item) => {
      return dayjs.unix(item).format("MM/DD/YYYY hh:mm a")
    },
    detailTransformer: () => {
      return ""
    },
  },
}

const activitiesSlice = createSlice({
  name: "activities",
  initialState,
  reducers: {
    activityEncountered: (immerState, { payload }) => {
      const activityItem = payload.tx
      const detailRows = renameAndPickKeys(keysMap, activityItem)

      payload.forAccounts.forEach((account: string) => {
        const address = account.toLowerCase()

        if (!immerState[address]) {
          immerState[address] = {}
        }

        immerState[address][activityItem.hash] = {
          ...activityItem,
          detailRows,
        }
      })
    },
  },
})

export type Events = {
  activityEncountered: AnyEVMTransaction
}

export const emitter = new Emittery<Events>()

export const { activityEncountered } = activitiesSlice.actions
export default activitiesSlice.reducer
