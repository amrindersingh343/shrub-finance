import React, {useEffect, useState} from "react";
import { ethers } from "ethers";
import {
  Stack,
  VisuallyHidden,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Drawer,
  DrawerBody,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  useDisclosure,
  Box,
  TableRowProps,
  Flex,
  Spacer,
  SlideFade,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  Text,
  ModalCloseButton, ModalBody
} from "@chakra-ui/react";

import {
  depositEth,
  depositToken,
  withdraw,
  approveToken,
  getFilledOrders,
  getAvailableBalance,
  exercise,
  signOrder,
  getLockedBalance
} from "../utils/ethMethods";
import UpdatePositions from "./UpdatePositions";
import {Balance, OrderCommon, ShrubBalance, SmallOrder} from "../types";
import { Currencies } from "../constants/currencies";
import {useWeb3React} from "@web3-react/core";
import ConnectWalletsView from "./ConnectWallets";

function Positions({ walletBalance }: { walletBalance: Balance }) {

  function handleErr(err?: Error, message?:string) {
    if(err) {
      // @ts-ignore
      setError(err.message);
      console.log(err);
    } else if(message) {
      setError(message);
    }
  }

  const { active, library, account } = useWeb3React();
  const tableRows:TableRowProps[] = [];
  const tableRowsOptions:any = [];
  const [action, setAction] = useState('');

  const [optionsRows, setOptionsRows] = useState(<></>)
  const [error, setError] = useState('')
  const [shrubBalance, setShrubBalance] = useState({locked: {}, available: {}} as ShrubBalance);

  const orderMap = new Map();

  useEffect(() => {
    setError('');
    async function inner() {
      if (!active || !account) {
        handleErr(undefined, 'Please connect your wallet')
        console.error('Please connect wallet');
        return;
      }
      const shrubBalanceObj:ShrubBalance = {locked: {}, available:{}};
      for (const currencyObj of Object.values(Currencies)) {
        const {symbol, address: tokenContractAddress} = currencyObj;
        const bigBalance = await getAvailableBalance({address: account, tokenContractAddress, provider: library})
        const bigLockedBalance = await getLockedBalance(account, tokenContractAddress, library);
        const balance = ethers.utils.formatUnits(bigBalance, 18);
        const lockedBalance = ethers.utils.formatUnits(bigLockedBalance, 18);
        shrubBalanceObj.available[symbol] = Number(balance);
        shrubBalanceObj.locked[symbol] = Number(lockedBalance);
      }
      setShrubBalance(shrubBalanceObj)
    }
    inner()
    .catch(console.error);
  }, [active, account, library]);


  useEffect(() => {
    setError('');
    async function inner() {
      if (!active || !account) {
        handleErr(undefined, 'Please connect your wallet')
        console.error('Please connect wallet');
        return;
      }
      const filledOrders = await getFilledOrders(account, library);
      // Populate Option Positions Table
      for (const details of Object.values(filledOrders)) {
        const {pair, strike, expiry, optionType, amount, common, buyOrder, seller} = details as {baseAsset: string, quoteAsset: string, pair: string, strike: string, expiry: string, optionType:string, amount:number, common: OrderCommon, buyOrder: SmallOrder, seller: string};
        orderMap.set(`${pair}${strike}${expiry}${optionType}`, {common, buyOrder, seller});
        tableRowsOptions.push(
            <Tr>
              <Td>{pair}</Td>
              <Td>{strike}</Td>
              <Td>{expiry}</Td>
              <Td>{optionType}</Td>
              <Td>{amount}</Td>
              <Td>
                <Button
                    colorScheme="teal"
                    size="xs"
                    onClick={() => handleClickExercise(pair, strike, expiry, optionType)}
                >
                  Exercise
                </Button>
              </Td>
            </Tr>
        )
      }
      setOptionsRows(tableRowsOptions);
    }
    inner()
    .catch(console.error);
  }, [active, account, library])


  const {
    isOpen: isOpenDrawer,
    onOpen: onOpenDrawer,
    onClose: onCloseDrawer
  } = useDisclosure();

  const {
    isOpen: isOpenConnectModal,
    onOpen: onOpenConnectModal,
    onClose: onCloseConnectModal
  } = useDisclosure();


  const [value, setValue] = useState("0");
  const [drawerCurrency, setDrawerCurrency] = useState(
    "ETH" as keyof typeof Currencies
  );

  function handleClickWithdraw() {
    handleClick('Withdraw');
    setError('');
  }

  function handleClickDeposit() {
    handleClick('Deposit');
    setError('');

  }

  async function handleClickExercise(pair: string, strike: string, expiry:string, optionType:string) {
    const key = `${pair}${strike}${expiry}${optionType}`
    const {common, buyOrder, seller} = orderMap.get(key);
    const unsignedOrder = { ...common, ...buyOrder };
    const signedOrder = await signOrder(unsignedOrder, library)
    const exercised = await exercise(signedOrder, seller, library)
    return exercised;
  }

  function handleClick(passButtonText: string) {
    onOpenDrawer();
    setAction(passButtonText);
  }

  function totalUserBalance(currency: string) {
    return shrubBalance.locked[currency] + shrubBalance.available[currency];
  }

  // Populate Balance Table
  for (const currency of Object.keys(Currencies)) {
    tableRows.push(
      <Tr key={currency}>
        <Td>{currency}</Td>
        <Td>{totalUserBalance(currency)}</Td>
        <Td>{shrubBalance.locked[currency]}</Td>
        <Td>{shrubBalance.available[currency]}</Td>
        <Td>
          <Stack spacing={4} direction="row" align="center">
            <Button
              colorScheme="teal"
              size="xs"
              onClick={handleClickWithdraw}
              isDisabled={!active}
            >
              Withdraw
            </Button>
            <Button
              colorScheme="teal"
              size="xs"
              onClick={handleClickDeposit}
              isDisabled={!active}
            >
              Deposit
            </Button>
          </Stack>
        </Td>
      </Tr>
    );
  }

  return (
      <>
        {error && (
            <>
            <SlideFade in={true} unmountOnExit={true}>
              <Alert status="error" borderRadius={7} mb={6}>
                <AlertIcon />
                {error}
                <Box pl="5" onClick={onOpenConnectModal}>
                  <Button colorScheme="cyan" variant="outline" size="sm">
                    Connect Wallet
                  </Button>
              </Box>
              </Alert>

            </SlideFade>

              <Modal isOpen={isOpenConnectModal} onClose={onCloseConnectModal}>
                <ModalOverlay />
                <ModalContent top="6rem" boxShadow="dark-lg" borderRadius="15">
                  <ModalHeader>
                    <Text fontSize={20}>Connect to a wallet</Text>
                  </ModalHeader>
                  <ModalCloseButton />
                  <ModalBody>
                    <ConnectWalletsView />
                  </ModalBody>
                </ModalContent>
              </Modal>
            </>
        )}
        <Box>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Asset</Th>
                <Th>Total</Th>
                <Th>Locked</Th>
                <Th>Unlocked</Th>
                <Th>
                  <VisuallyHidden/>
                </Th>
              </Tr>
            </Thead>
            <Tbody>{tableRows}</Tbody>
          </Table>
          <Drawer
              onClose={onCloseDrawer}
              isOpen={isOpenDrawer}
              placement="right">
            <DrawerOverlay/>
            <DrawerContent>
              <DrawerHeader>{action}</DrawerHeader>
              <DrawerCloseButton/>
              <DrawerBody>
                <UpdatePositions
                    value={value}
                    setValue={setValue}
                    drawerCurrency={drawerCurrency}
                    setDrawerCurrency={setDrawerCurrency}
                    walletBalance={walletBalance}
                    shrubBalance={shrubBalance}
                    action={action}
                    error={error}
                />
                <Flex>
                {drawerCurrency !== "ETH" && action === "Deposit" ? (
                    <Button
                        colorScheme="teal"
                        onClick={() => {
                          if (active) {
                            approveToken(
                                Currencies[drawerCurrency].address,
                                ethers.utils.parseUnits(value),
                                library
                            ).catch(handleErr)
                          }
                        }
                      }
                    >
                      Approve
                    </Button>
                ) : null}
                      <Spacer/>
                <Button
                    colorScheme="teal"
                    onClick={() => {
                        if (!active) {
                          handleErr(undefined,'Please connect your wallet');
                          return;
                        }
                      if (action === "Deposit") {
                        if (drawerCurrency === "ETH") {
                          depositEth(ethers.utils.parseUnits(value), library
                          ).catch(handleErr);
                        } else {
                          depositToken(
                              Currencies[drawerCurrency].address,
                              ethers.utils.parseUnits(value),
                              library
                          ).catch(handleErr);
                        }
                      } else if (action === "Withdraw") {
                        withdraw(
                            Currencies[drawerCurrency].address,
                            ethers.utils.parseUnits(value),
                            library
                        ).catch(handleErr);
                      }
                    }}
                >
                  {action}
                </Button>
                    </Flex>
              </DrawerBody>
            </DrawerContent>
          </Drawer>
        </Box>
        <br/>
        <Box>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Pair</Th>
                <Th>Strike</Th>
                <Th>Expiry</Th>
                <Th>Option Type</Th>
                <Th>Amount</Th>
                <Th>
                  <VisuallyHidden/>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {optionsRows}
            </Tbody>
          </Table>
        </Box>
      </>
  );
}

export default Positions;
