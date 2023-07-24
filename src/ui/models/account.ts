import { Chain } from '@debank/common';

import type { Account } from '@/background/service/preference';
import { KEYRING_CLASS } from '@/constant';
import { createModel } from '@rematch/core';
import { DisplayedKeryring } from 'background/service/keyring';
import { TotalBalanceResponse } from 'background/service/openapi';
import { RootModel } from '.';
import { AbstractPortfolioToken } from 'ui/utils/portfolio/types';
import { DisplayChainWithWhiteLogo, formatChainToDisplay } from '@/utils/chain';
import { coerceFloat } from '../utils';
import { isTestnet as checkIsTestnet } from '@/utils/chain';
import { requestOpenApiMultipleNets } from '../utils/openapi';

export interface AccountState {
  currentAccount: null | Account;
  visibleAccounts: DisplayedKeryring[];
  hiddenAccounts: Account[];
  alianName: string;
  keyrings: DisplayedKeryring[];
  balanceMap: {
    [address: string]: TotalBalanceResponse;
  };
  matteredChainBalances: {
    [P in Chain['serverId']]?: DisplayChainWithWhiteLogo;
  };
  tokens: {
    list: AbstractPortfolioToken[];
    customize: AbstractPortfolioToken[];
    blocked: AbstractPortfolioToken[];
  };
  testnetTokens: {
    list: AbstractPortfolioToken[];
    customize: AbstractPortfolioToken[];
    blocked: AbstractPortfolioToken[];
  };

  mnemonicAccounts: DisplayedKeryring[];
}

export const account = createModel<RootModel>()({
  name: 'account',

  state: {
    currentAccount: null,
    alianName: '',
    visibleAccounts: [],
    hiddenAccounts: [],
    keyrings: [],
    balanceMap: {},
    matteredChainBalances: {},
    mnemonicAccounts: [],
    tokens: {
      list: [],
      customize: [],
      blocked: [],
    },
    testnetTokens: {
      list: [],
      customize: [],
      blocked: [],
    },
  } as AccountState,

  reducers: {
    setField(state, payload: Partial<typeof state>) {
      return Object.keys(payload).reduce(
        (accu, key) => {
          accu[key] = payload[key];
          return accu;
        },
        { ...state }
      );
    },

    setTestnetTokenList(state, payload: AbstractPortfolioToken[]) {
      return {
        ...state,
        testnetTokens: {
          ...state.testnetTokens,
          list: payload,
        },
      };
    },

    setTokenList(state, payload: AbstractPortfolioToken[]) {
      return {
        ...state,
        tokens: {
          ...state.tokens,
          list: payload,
        },
      };
    },

    setTestnetCustomizeTokenList(state, payload: AbstractPortfolioToken[]) {
      return {
        ...state,
        testnetTokens: {
          ...state.testnetTokens,
          customize: payload,
        },
      };
    },

    setCustomizeTokenList(state, payload: AbstractPortfolioToken[]) {
      return {
        ...state,
        tokens: {
          ...state.tokens,
          customize: payload,
        },
      };
    },

    setBlockedTokenList(state, payload: AbstractPortfolioToken[]) {
      return {
        ...state,
        tokens: {
          ...state.tokens,
          blocked: payload,
        },
      };
    },

    setTestnetBlockedTokenList(state, payload: AbstractPortfolioToken[]) {
      return {
        ...state,
        testnetTokens: {
          ...state.testnetTokens,
          blocked: payload,
        },
      };
    },

    setCurrentAccount(
      state,
      payload: { currentAccount: typeof state.currentAccount }
    ) {
      return { ...state, currentAccount: payload.currentAccount };
    },
  },

  selectors: (slice) => {
    return {
      isShowMnemonic() {
        return slice((account) => account.mnemonicAccounts.length <= 0);
      },
      currentAccountAddr() {
        return slice((account) => account.currentAccount?.address);
      },
    };
  },

  effects: (dispatch) => ({
    init() {
      return this.getCurrentAccountAsync();
    },
    async getCurrentAccountAsync(_?: any, store?) {
      const account: Account = await store.app.wallet.getCurrentAccount<Account>();
      if (account) {
        dispatch.account.setCurrentAccount({ currentAccount: account });
      }

      return account;
    },

    async changeAccountAsync(account: Account, store) {
      const { address, type, brandName } = account;
      const nextVal: Account = { address, type, brandName };

      await store.app.wallet.changeAccount(nextVal);
      dispatch.account.setCurrentAccount({ currentAccount: nextVal });
      // clear store tokenList when account changed
      dispatch.account.setTokenList([]);
      dispatch.account.setBlockedTokenList([]);
      dispatch.account.setCustomizeTokenList([]);
      dispatch.account.setTestnetTokenList([]);
      dispatch.account.setTestnetBlockedTokenList([]);
      dispatch.account.setTestnetCustomizeTokenList([]);
    },

    async getAlianNameAsync(address: string, store) {
      const name = await store.app.wallet.getAlianName<string>(address);

      dispatch.account.setField({ alianName: name });
      return name;
    },

    async getAllClassAccountsAsync(_?, store?) {
      const keyrings = await store.app.wallet.getAllClassAccounts<
        DisplayedKeryring[]
      >();
      dispatch.account.setField({ keyrings });
      return keyrings;
    },

    async getAllVisibleAccountsAsync(_, store) {
      const visibleAccounts = await store.app.wallet.getAllVisibleAccounts();
      dispatch.account.setField({ visibleAccounts });
      return visibleAccounts;
    },

    async getAllHiddenAccountsAsync(_, store) {
      const hiddenAccounts = await store.app.wallet.getHiddenAddresses<
        Account[]
      >();
      dispatch.account.setField({ hiddenAccounts });
      return hiddenAccounts;
    },

    async getTypedMnemonicAccountsAsync(_?, store?) {
      const mnemonicAccounts = await store.app.wallet.getTypedAccounts(
        KEYRING_CLASS.MNEMONIC
      );
      dispatch.account.setField({ mnemonicAccounts });
    },

    async addCustomizeToken(token: AbstractPortfolioToken, store?) {
      await store.app.wallet.addCustomizedToken({
        address: token._tokenId,
        chain: token.chain,
      });
      const isTestnetToken = checkIsTestnet(token.chain);
      const currentList = isTestnetToken
        ? store.account.testnetTokens.customize
        : store.account.tokens.customize;
      const setCustomizeTokenList = isTestnetToken
        ? dispatch.account.setTestnetCustomizeTokenList
        : dispatch.account.setCustomizeTokenList;
      const setTokenList = isTestnetToken
        ? dispatch.account.setTestnetTokenList
        : dispatch.account.setTokenList;
      setCustomizeTokenList([...currentList, token]);
      if (token.amount > 0) {
        setTokenList([...store.account.tokens.list, token]);
      }
    },

    async removeCustomizeToken(token: AbstractPortfolioToken, store?) {
      await store.app.wallet.removeCustomizedToken({
        address: token._tokenId,
        chain: token.chain,
      });
      const isTestnetToken = checkIsTestnet(token.chain);
      const currentList = isTestnetToken
        ? store.account.testnetTokens.customize
        : store.account.tokens.customize;
      const setCustomizeTokenList = isTestnetToken
        ? dispatch.account.setTestnetCustomizeTokenList
        : dispatch.account.setCustomizeTokenList;
      const setTokenList = isTestnetToken
        ? dispatch.account.setTestnetTokenList
        : dispatch.account.setTokenList;
      setCustomizeTokenList(
        currentList.filter((item) => {
          return item.id !== token.id;
        })
      );
      setTokenList(
        store.account.tokens.list.filter((item) => item.id !== token.id)
      );
    },

    async addBlockedToken(token: AbstractPortfolioToken, store?) {
      await store.app.wallet.addBlockedToken({
        address: token._tokenId,
        chain: token.chain,
      });
      const isTestnetToken = checkIsTestnet(token.chain);
      const currentList = isTestnetToken
        ? store.account.testnetTokens.blocked
        : store.account.tokens.blocked;
      const setBlockedTokenList = isTestnetToken
        ? dispatch.account.setTestnetBlockedTokenList
        : dispatch.account.setBlockedTokenList;
      const setTokenList = isTestnetToken
        ? dispatch.account.setTestnetTokenList
        : dispatch.account.setTokenList;
      setBlockedTokenList([...currentList, token]);
      setTokenList(
        store.account.tokens.list.filter((item) => item.id !== token.id)
      );
    },

    async removeBlockedToken(token: AbstractPortfolioToken, store?) {
      await store.app.wallet.removeBlockedToken({
        address: token._tokenId,
        chain: token.chain,
      });
      const isTestnetToken = checkIsTestnet(token.chain);
      const currentList = isTestnetToken
        ? store.account.testnetTokens.blocked
        : store.account.tokens.blocked;
      const setBlockedTokenList = isTestnetToken
        ? dispatch.account.setTestnetBlockedTokenList
        : dispatch.account.setBlockedTokenList;
      const setTokenList = isTestnetToken
        ? dispatch.account.setTestnetTokenList
        : dispatch.account.setTokenList;
      setBlockedTokenList(
        currentList.filter((item) => {
          return item.id !== token.id;
        })
      );
      if (token.amount > 0) {
        setTokenList([...store.account.tokens.list, token]);
      }
    },

    async triggerFetchBalanceOnBackground(
      options?: {
        forceUpdate?: boolean;
      },
      store?
    ) {
      const currentAccount = store.account.currentAccount;

      if (!currentAccount?.address) return;
      const wallet = store.app.wallet;

      const isShowTestnet = store.preference.isShowTestnet;

      await requestOpenApiMultipleNets<TotalBalanceResponse | null, void>(
        (ctx) => {
          return wallet.getAddressBalance(
            currentAccount.address,
            true /* force */,
            ctx.isTestnetTask
          );
        },
        {
          wallet,
          needTestnetResult: isShowTestnet,
          processResults: () => null,
          fallbackValues: {
            mainnet: null,
            testnet: null,
          },
        }
      );
    },

    async getMatteredChainBalance(
      options?: { isTestnet?: boolean },
      store?
    ): Promise<AccountState['matteredChainBalances']> {
      const wallet = store.app.wallet;
      const isShowTestnet = store.preference.isShowTestnet;

      const currentAccountAddr = store.account.currentAccount?.address;

      const cachedBalance = await requestOpenApiMultipleNets<TotalBalanceResponse | null>(
        (ctx) => {
          return wallet.getAddressCacheBalance(
            currentAccountAddr,
            ctx.isTestnetTask
          );
        },
        {
          wallet,
          needTestnetResult: isShowTestnet,
          processResults: ({ mainnet, testnet }) => {
            if (!mainnet) return null;

            return {
              chain_list: mainnet.chain_list.concat(testnet?.chain_list || []),
              // pointless here, just for type check
              total_usd_value: mainnet.total_usd_value,
            };
          },
          fallbackValues: {
            mainnet: null,
            testnet: null,
          },
        }
      );

      const totalUsdValue = (cachedBalance?.chain_list || []).reduce(
        (accu, cur) => accu + coerceFloat(cur.usd_value),
        0
      );

      const matteredChainBalances = (cachedBalance?.chain_list || []).reduce(
        (accu, cur) => {
          const curUsdValue = coerceFloat(cur.usd_value);
          // TODO: only leave chain with blance greater than $1 and has percentage 1%
          if (curUsdValue > 1 && curUsdValue / totalUsdValue > 0.01) {
            accu[cur.id] = formatChainToDisplay(cur);
          }
          return accu;
        },
        {} as AccountState['matteredChainBalances']
      );

      dispatch.account.setField({
        matteredChainBalances,
      });

      return matteredChainBalances;
    },
  }),
});
