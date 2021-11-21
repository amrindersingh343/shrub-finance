import React, {ReactNode, useContext, useState} from "react";
import {
  Box,
  Flex,
  Text,
  HStack,
  Link,
  IconButton,
  Button,
  useDisclosure,
  useColorMode,
  useColorModeValue,
  Stack,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton, Spinner
} from "@chakra-ui/react";
import {HamburgerIcon, CloseIcon, SunIcon, MoonIcon, InfoOutlineIcon, Icon, ExternalLinkIcon} from '@chakra-ui/icons';
import { Link as ReachLink } from "@reach/router";
import {Account, Balance, Chain, ConnectionStatus, ConnectWalletModal, getErrorMessage} from "./ConnectWallet";
import {useConnectWallet} from "../hooks/useConnectWallet";
import {ShrubLogo} from "../assets/Icons";
import {TxContext} from "./Store";
import {confirmingCount, TxStatusList} from "./TxMonitoring";
import {isMobile} from "react-device-detect";
import {GiCoins} from 'react-icons/gi';
import {FaFileContract, HiOutlineDocumentDuplicate} from 'react-icons/all';
import Faucet from './Faucet'
import usePriceFeed from '../hooks/usePriceFeed'


function TopNav() {

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isFaucetModalOpen, onOpen: onFaucetModalOpen, onClose: onFaucetModalClose } = useDisclosure();
  const { isOpen: isMenuOpen, onOpen: onMenuOpen, onClose: onMenuClose } = useDisclosure();
  const { colorMode, toggleColorMode } = useColorMode();
  const spinnerBg = useColorModeValue("black","cyan.500")
  const {active, error: web3Error} = useConnectWallet();
  const { pendingTxs } = useContext(TxContext);
  const [pendingTxsState] = pendingTxs;
  const confirmingCountNumber = confirmingCount(pendingTxsState);
  const displayStatus = (val: boolean ) => {
    setIsHidden(val);
  };
  const [isHidden, setIsHidden] = useState(false);
  const gradient = useColorModeValue(
      "linear(to-r, gray.100, gray.200)",
      "linear(to-l, gray.700, gray.700)"
  );
  const topNavShadow = useColorModeValue("md", "md");
  const topNavBgColor = useColorModeValue("white", "dark.100");
  useColorModeValue("sprout", "teal");
  function handleModalClose() {
    onClose();
    displayStatus(false);
}

  const NavRoutes = [{item:'Shrubfolio', itemIcon:GiCoins}, {item:'Options', itemIcon: FaFileContract}];

  const NavRoute = ({ children, path, itemIcon }: { children: ReactNode, path: string, itemIcon?: any }) => (
      <Link px={2} py={{ base: "3", md: "1", lg: "1" }} rounded={"lg"}
          _hover={{textDecoration: "none", bgGradient: gradient}}
          as={ReachLink} to={path.toLowerCase()} onClick={onMenuClose}>
        {children}
      </Link>
);


  return (
    <Box>
      <Box shadow={topNavShadow} bg={topNavBgColor} px={4}  >
        <Flex h={16} alignItems={"center"} justifyContent={"space-between"} >
          <HStack spacing={8} alignItems={"center"}>
            <Link as={ReachLink} to={'/'} >
              <ShrubLogo boxSize={10}/>
            </Link>
            <HStack as={"nav"} spacing={4} display={{ base: "none", md: "flex" }}>
              {NavRoutes.map((route) => (
                  <NavRoute itemIcon={route.itemIcon} key={route.item} path={route.item}>
                   {route.item}
                  </NavRoute>))}
              <Link
                  href="https://docs.shrub.finance"
                  isExternal
                  variant="ghost"
                  cursor="pointer"
                  px={2} py={{ base: "3", md: "1", lg: "1" }} rounded={"lg"}
                  _hover={{textDecoration: "none", bgGradient: gradient}}
                  >
                Docs <ExternalLinkIcon mx="2px" />
              </Link>
            </HStack>
          </HStack>
          <Flex alignItems={"center"}>
            {!isMobile && <Box pr={5} display={{ base: "none", sm: "flex" }}><Balance/></Box>}
            {!isMobile && <Box display={{ base: "none", sm: "flex" }}><Chain/></Box>}
            <Box onClick={onOpen}
                 mr={isMobile ? '19.5': '0'}
            >
              {/*connect wallet button*/}
              <Button variant={"solid"} colorScheme={!!web3Error ? "red": "yellow"}
                  size={"md"} mr={4} borderRadius="full" leftIcon={!!web3Error ?
                    <InfoOutlineIcon colorScheme="red"/> : undefined}> {!!web3Error && !active ?
                    getErrorMessage(web3Error).title :
                      confirmingCountNumber > 0 ?
                        <><Spinner thickness="1px" speed="0.65s" color={spinnerBg} size="xs" mr={2} />
                          {confirmingCountNumber} Pending...</> :
                        <Account/>}
              </Button>
            </Box>
            <IconButton variant="unstyled"
            icon={isMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
            aria-label={"Open Menu"} display={{ md: "none" }}
            onClick={isMenuOpen ? onMenuClose : onMenuOpen}/>

            {!isMobile && <Button onClick={toggleColorMode} variant="ghost" display={{ base: "none", md: "block" }}>
              {colorMode === "light" ? <MoonIcon /> : <SunIcon />}
            </Button>}
          </Flex>
        </Flex>

        {isMenuOpen ? (
            <Box pb={4} display={{ md: "none" }}>
            <Stack as={"nav"} spacing={3}>
                {NavRoutes.map((route) =>
                (<NavRoute itemIcon={route.itemIcon} key={route.item} path={route.item}>
                  <Icon as={route.itemIcon} mr={2} /> {route.item}
                </NavRoute>))}
              <Link
                  href="https://docs.shrub.finance"
                  isExternal
                  variant="ghost"
                  cursor="pointer"
                  rounded="lg"
                  py={'3'}
                  px={'2'}
                  _hover={{
                    textDecoration: "none",
                    bgGradient: gradient
                  }}>
                <Icon as={HiOutlineDocumentDuplicate} mr={'2'}/>Docs <ExternalLinkIcon mx="2px" />
              </Link>
              <Box
                   onClick={toggleColorMode}
                   variant="ghost"
                   cursor="pointer"
                   rounded="lg"
                   py={'3'}
                   px={'2'}
                   _hover={{
                     textDecoration: "none",
                     bgGradient: gradient
                   }}>
                {colorMode === "light" ? <MoonIcon mr={'2'}/> : <SunIcon mr={'2'}/>}
                {colorMode === "light" ? 'Dark Mode' : 'Light Mode'}
              </Box>
            </Stack>
            </Box>
        ) : null
        }
      </Box>

      <Modal isOpen={isOpen} onClose={handleModalClose} motionPreset="slideInBottom" scrollBehavior={isMobile ?"inside" : "outside"}>
        <ModalOverlay />
        <ModalContent top="6rem" boxShadow="dark-lg" borderRadius="2xl">
          <ModalHeader>{ !active ? 'Connect Wallet' :
              !isHidden ? <Text fontSize={16}>Account Details</Text>:
            <Button variant="ghost" onClick={() => displayStatus(false)}>Back</Button>
          } </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {!active || isHidden? <ConnectWalletModal/> : !isHidden &&<ConnectionStatus displayStatus={displayStatus}/>}
            { !(web3Error && getErrorMessage(web3Error).title === "Wrong Network") && <TxStatusList/>}
          </ModalBody>
        </ModalContent>
      </Modal>

      <Modal isOpen={isFaucetModalOpen} onClose={onFaucetModalClose} motionPreset="slideInBottom" scrollBehavior={isMobile ?"inside" : "outside"}>
        <ModalOverlay />
        <ModalContent top="6rem" boxShadow="dark-lg" borderRadius="2xl">
          <ModalHeader> Test Faucet</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Faucet/>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default TopNav;
