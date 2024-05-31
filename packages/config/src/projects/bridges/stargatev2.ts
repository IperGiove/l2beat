import { EthereumAddress, ProjectId } from '@l2beat/shared-pure'

import { NUGGETS } from '../../common'
import { ProjectDiscovery } from '../../discovery/ProjectDiscovery'
import { RISK_VIEW } from './common'
import { Bridge } from './types'

const discovery = new ProjectDiscovery('stargatev2')

export const stargatev2: Bridge = {
  type: 'bridge',
  id: ProjectId('stargate'),
  display: {
    name: 'StarGate (LayerZero)',
    slug: 'stargate',
    links: {
      websites: ['https://stargate.finance/', 'https://layerzero.network/'],
      apps: ['https://layerzeroscan.com/'],
      repositories: [
        'https://github.com/stargate-protocol/stargate-v2',
        'https://github.com/LayerZero-Labs/LayerZero-v2',
      ],
      socialMedia: [
        'https://discord.com/invite/ymBqyE6',
        'https://t.me/joinchat/LEM0ELklmO1kODdh',
        'https://medium.com/stargate-official',
        'https://x.com/StargateFinance',
      ],
    },
    description:
      'StarGate v2 is a Hybrid Bridge (mainly Liquidity Network) built on top of the Layer Zero messaging protocol.',
    detailedDescription:
      'It uses liquidity pools on all supported chains, supports optional batching and a Token Bridge mode called Hydra that can mint tokens at the destination.',
    category: 'Hybrid',
  },
  riskView: {
    validatedBy: {
      value: 'Third Party',
      description:
        'The Layer Zero message protocol is used: If all preconfigured verifiers agree on a message, it is considered verified and can be executed by a permissioned Executor at the destination.',
      sentiment: 'bad',
    },
    sourceUpgradeability: RISK_VIEW.UPGRADABLE_NO,
    destinationToken: RISK_VIEW.CANONICAL, // TODO: find Hydra onchain
  },
  technology: {
    destination: [
      'Ethereum',
      'BNB Chain',
      'Avalanche',
      'Polygon',
      'Arbitrum',
      'Optimism',
      'Metis',
      'Linea',
      'Mantle',
      'Base',
      'Kava',
      'Scroll',
      'Klaytn',
    ],
    principleOfOperation: {
      name: 'Principle of operation',
      description:
        'StarGate is a Liquidity Network. It relies on liquidity providers to supply tokens to liquidity pools on each chain. \
        Users can swap tokens between chains by transferring their tokens to a pool and receive token from the pool on the destination chain.',
      references: [],
      risks: [],
    },
    validation: {
      name: 'Layer Zero DVN',
      description:
        'The Layer Zero message protocol is used: For validation of Stargate messages, two verifiers are currently configured: Nethermind and Stargate. If both verifiers agree on a message, it is verified and can be executed by a permissioned Executor at the destination. This configuration can be changed at any time by the StargateMultisig.', // TODO: fetch verifiers from discovery
      references: [],
      risks: [
        {
          category: 'Users can be censored if',
          text: 'All the configured required Verifiers or the Executor fail to facilitate the transaction.',
          isCritical: true,
        },
        {
          category: 'Funds can be stolen if',
          text: 'All the configured required Verifiers collude to submit a fraudulent message.',
          isCritical: true,
        },
        {
          category: 'Funds can be stolen if',
          text: 'The OApp owner (Stargate Multisig) changes the OApp configuration maliciously.',
          isCritical: true,
        },
      ],
    },
  },
  config: {
    escrows: [
      {
        ...discovery.getEscrowDetails({
          address: EthereumAddress(
            '0xc026395860Db2d07ee33e05fE50ed7bD583189C7',
          ),
          tokens: ['USDC'],
          description: 'Stargate Liquidity pool for USDC on Ethereum.',
        }),
      },
      {
        chain: 'arbitrum',
        includeInTotal: false,
        ...discovery.getEscrowDetails({
          address: EthereumAddress(
            '0xe8CDF27AcD73a434D661C84887215F7598e7d0d3',
          ),
          tokens: ['USDC'],
          description: 'Stargate Liquidity pool for USDC on Arbitrum.',
        }),
      },
      {
        chain: 'optimism',
        includeInTotal: false,
        ...discovery.getEscrowDetails({
          address: EthereumAddress(
            '0xcE8CcA271Ebc0533920C83d39F417ED6A0abB7D0',
          ),
          tokens: ['USDC'],
          description: 'Stargate Liquidity pool for USDC on Optimism.',
        }),
      },
      {
        chain: 'base',
        includeInTotal: false,
        ...discovery.getEscrowDetails({
          address: EthereumAddress(
            '0x27a16dc786820B16E5c9028b75B99F6f604b5d26',
          ),
          tokens: ['USDC'],
          description: 'Stargate Liquidity pool for USDC on Base.',
        }),
      },
    ],
  },
  contracts: {
    addresses: [
      discovery.getContractDetails('TokenMessaging', 'OApp.'),
      discovery.getContractDetails('CreditMessaging'),
    ],
    risks: [],
  },
  permissions: [
    ...discovery.getMultisigPermission(
      'StarGate Multisig',
      'Bridge owner, can create new pools, chainpaths, set fees.',
    ),
    ...discovery.getMultisigPermission(
      'LayerZero Multisig',
      'The owner of Endpoint, UltraLightNode and Treasury contracts. Can switch to a new UltraLightNode for an Endpoint. Can switch proof library for an UltraLightNode and change Treasury.',
    ),
    // {
    //   accounts: [
    //     {
    //       address: EthereumAddress(
    //         '0x76F6d257CEB5736CbcAAb5c48E4225a45F74d6e5',
    //       ),
    //       type: 'EOA',
    //     },
    //   ],
    //   name: 'LayerZero Relayer Admin owner',
    //   description: 'Can upgrade LayerZero relayer contract with no delay.',
    // },
  ],
  knowledgeNuggets: [
    {
      title: 'Security models: isolated vs shared',
      url: 'https://medium.com/l2beat/circumventing-layer-zero-5e9f652a5d3e',
      thumbnail: NUGGETS.THUMBNAILS.L2BEAT_01,
    },
  ],
}
