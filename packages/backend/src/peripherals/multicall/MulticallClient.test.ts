import { Bytes, EthereumAddress } from '@l2beat/shared-pure'
import { expect, mockObject } from 'earl'

import { Logger } from '@l2beat/backend-tools'
import { ethers } from 'ethers'
import { RpcClient } from '../rpcclient/RpcClient'
import { BlockTag } from '../rpcclient/types'
import { MulticallClient } from './MulticallClient'
import {
  decodeMulticallV1,
  decodeMulticallV2,
  encodeMulticallV1,
  encodeMulticallV2,
  multicallInterface,
  toMulticallConfigEntry,
} from './MulticallConfig'
import { nativeAssetCodec } from './codecs'
import { MulticallConfigEntry } from './types'

describe('test', () => {
  it.only('test', async () => {
    const provider = new ethers.providers.JsonRpcProvider(
      'https://arb-mainnet.g.alchemy.com/v2/gFYyGuUYUq-5ZtVgLpWWzrEG_caFVj3f',
    )

    const multicallConfig = toMulticallConfigEntry({
      address: EthereumAddress('0xcA11bde05977b3631167028862bE2a173976CA11'),
      batchSize: 150,
      sinceBlock: 7654707,
      version: '3',
      // TODO: fix this
      isNativeBalanceSupported: true,
    })

    const logger = new Logger({ logLevel: 'DEBUG' })
    const rpcClient = new RpcClient(provider, logger)
    const multicallClient = new MulticallClient(rpcClient, [multicallConfig])

    const encode = nativeAssetCodec.balance.encode(
      EthereumAddress('0x074fFD20C6D8865752C997f4980Cf70F2a3Fbac6'),
    )
    console.log(encode)

    const res = await multicallClient.multicall([encode], 218325382)
    console.log(res)
  })
})

describe(MulticallClient.name, () => {
  const ADDRESS_A = EthereumAddress('0x' + 'a'.repeat(40))
  const ADDRESS_B = EthereumAddress('0x' + 'b'.repeat(40))
  const ADDRESS_C = EthereumAddress('0x' + 'c'.repeat(40))

  const ADDRESS_V2 = EthereumAddress('0x' + '2'.repeat(40))
  const ADDRESS_V1 = EthereumAddress('0x' + '1'.repeat(40))

  const MULTICALL_V2_BLOCK = 2_222
  const MULTICALL_V1_BLOCK = 1_111
  const BATCH_SIZE = 3
  const TEST_MULTICALL_CONFIG: MulticallConfigEntry[] = [
    {
      sinceBlock: MULTICALL_V2_BLOCK,
      batchSize: BATCH_SIZE,
      address: ADDRESS_V2,
      encodeBatch: encodeMulticallV2,
      decodeBatch: decodeMulticallV2,
      isNativeBalanceSupported: true,
    },
    {
      sinceBlock: MULTICALL_V1_BLOCK,
      batchSize: BATCH_SIZE,
      address: ADDRESS_V1,
      encodeBatch: encodeMulticallV1,
      decodeBatch: decodeMulticallV1,
      isNativeBalanceSupported: true,
    },
  ]

  interface Call {
    to?: EthereumAddress
    data?: Bytes
    blockTag: BlockTag
  }

  it('falls back to individual requests for old block numbers', async () => {
    const calls: Call[] = []
    const ethereumClient = mockObject<RpcClient>({
      async call(parameters, blockTag) {
        calls.push({ to: parameters.to, data: parameters.data, blockTag })
        return parameters.data ?? Bytes.EMPTY
      },
    })

    const multicallClient = new MulticallClient(
      ethereumClient,
      TEST_MULTICALL_CONFIG,
    )
    const blockTag = MULTICALL_V1_BLOCK - 1
    const result = await multicallClient.multicall(
      [
        { address: ADDRESS_A, data: Bytes.fromHex('0x123456') },
        { address: ADDRESS_B, data: Bytes.fromHex('0x') },
        { address: ADDRESS_C, data: Bytes.fromHex('0xdeadbeef') },
      ],
      blockTag,
    )
    expect(result).toEqual([
      { success: true, data: Bytes.fromHex('0x123456') },
      // empty result is treated as unsuccessful!
      { success: false, data: Bytes.fromHex('0x') },
      { success: true, data: Bytes.fromHex('0xdeadbeef') },
    ])
    expect(calls).toEqual([
      { to: ADDRESS_A, data: Bytes.fromHex('0x123456'), blockTag },
      { to: ADDRESS_B, data: Bytes.fromHex('0x'), blockTag },
      { to: ADDRESS_C, data: Bytes.fromHex('0xdeadbeef'), blockTag },
    ])
  })

  it('uses v1 for blocks without v2', async () => {
    const calls: Call[] = []
    const ethereumClient = mockObject<RpcClient>({
      async call(parameters, blockTag) {
        calls.push({ to: parameters.to, data: parameters.data, blockTag })
        return Bytes.fromHex(
          multicallInterface.encodeFunctionResult('aggregate', [
            blockTag.toString(),
            ['0x12', '0x0f00', '0x'],
          ]),
        )
      },
    })

    const multicallClient = new MulticallClient(
      ethereumClient,
      TEST_MULTICALL_CONFIG,
    )
    const blockTag = MULTICALL_V1_BLOCK + 1

    const result = await multicallClient.multicall(
      [
        { address: ADDRESS_A, data: Bytes.fromHex('0x123456') },
        { address: ADDRESS_B, data: Bytes.fromHex('0x') },
        { address: ADDRESS_C, data: Bytes.fromHex('0xdeadbeef') },
      ],
      blockTag,
    )
    expect(result).toEqual([
      { success: true, data: Bytes.fromHex('0x12') },
      { success: true, data: Bytes.fromHex('0x0f00') },
      // empty result is treated as unsuccessful!
      { success: false, data: Bytes.fromHex('0x') },
    ])
    expect(calls).toEqual([
      {
        to: ADDRESS_V1,
        data: encodeMulticallV1([
          { address: ADDRESS_A, data: Bytes.fromHex('0x123456') },
          { address: ADDRESS_B, data: Bytes.fromHex('0x') },
          { address: ADDRESS_C, data: Bytes.fromHex('0xdeadbeef') },
        ]),
        blockTag,
      },
    ])
  })

  it('uses v2 for new blocks', async () => {
    const calls: Call[] = []
    const ethereumClient = mockObject<RpcClient>({
      async call(parameters, blockTag) {
        calls.push({ to: parameters.to, data: parameters.data, blockTag })
        return Bytes.fromHex(
          multicallInterface.encodeFunctionResult('tryAggregate', [
            [
              [true, '0x12'],
              [false, '0x0f00'],
              [true, '0x'],
            ],
          ]),
        )
      },
    })

    const multicallClient = new MulticallClient(
      ethereumClient,
      TEST_MULTICALL_CONFIG,
    )
    const blockTag = MULTICALL_V2_BLOCK + 1

    const result = await multicallClient.multicall(
      [
        { address: ADDRESS_A, data: Bytes.fromHex('0x123456') },
        { address: ADDRESS_B, data: Bytes.fromHex('0x') },
        { address: ADDRESS_C, data: Bytes.fromHex('0xdeadbeef') },
      ],
      blockTag,
    )
    expect(result).toEqual([
      { success: true, data: Bytes.fromHex('0x12') },
      { success: false, data: Bytes.fromHex('0x0f00') },
      { success: false, data: Bytes.fromHex('0x') },
    ])
    expect(calls).toEqual([
      {
        to: ADDRESS_V2,
        data: encodeMulticallV2([
          { address: ADDRESS_A, data: Bytes.fromHex('0x123456') },
          { address: ADDRESS_B, data: Bytes.fromHex('0x') },
          { address: ADDRESS_C, data: Bytes.fromHex('0xdeadbeef') },
        ]),
        blockTag,
      },
    ])
  })

  it(`batches calls`, async () => {
    const calls: number[] = []
    const ethereumClient = mockObject<RpcClient>({
      async call(parameters) {
        const callCount: number = multicallInterface.decodeFunctionData(
          'tryAggregate',
          parameters.data?.toString() ?? '',
        )[1].length
        calls.push(callCount)
        return Bytes.fromHex(
          multicallInterface.encodeFunctionResult('tryAggregate', [
            new Array(callCount).fill(0).map(() => [true, '0x1234']),
          ]),
        )
      },
    })

    const multicallClient = new MulticallClient(
      ethereumClient,
      TEST_MULTICALL_CONFIG,
    )
    const blockTag = MULTICALL_V2_BLOCK + 1

    const result = await multicallClient.multicall(
      new Array(BATCH_SIZE * 2 + 1).fill(0).map(() => ({
        address: ADDRESS_A,
        data: Bytes.fromHex('0x123456'),
      })),
      blockTag,
    )
    expect(result.length).toEqual(BATCH_SIZE * 2 + 1)
    expect(calls).toEqual([BATCH_SIZE, BATCH_SIZE, 1])
  })
})
