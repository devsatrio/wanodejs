-- phpMyAdmin SQL Dump
-- version 4.9.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 06, 2021 at 06:28 AM
-- Server version: 10.4.11-MariaDB
-- PHP Version: 7.3.13

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `db_wanode`
--

-- --------------------------------------------------------

--
-- Table structure for table `tb_broadcast`
--

CREATE TABLE `tb_broadcast` (
  `id` int(11) NOT NULL,
  `kode` varchar(100) DEFAULT NULL,
  `tgl_buat` date DEFAULT NULL,
  `tgl_kirim` date DEFAULT NULL,
  `isi` mediumtext DEFAULT NULL,
  `id_user` int(11) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `nama` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `tb_broadcast`
--

INSERT INTO `tb_broadcast` (`id`, `kode`, `tgl_buat`, `tgl_kirim`, `isi`, `id_user`, `status`, `nama`) VALUES
(13, 'BRC0001', '2021-07-14', '2021-07-24', 'coba broadcast wa', 1, 'terkirim', 'broadcast wa pertama'),
(14, 'BRC0002', '2021-07-14', '2021-07-24', 'testing wa - jangan di balas', 1, 'terkirim', 'Broadcast Percobaan'),
(15, 'BRC0003', '2021-07-14', '2021-07-24', 'coba broadcast - jangan balas', 1, 'terkirim', 'coba broadcast tiga');

-- --------------------------------------------------------

--
-- Table structure for table `tb_contact`
--

CREATE TABLE `tb_contact` (
  `id` int(11) NOT NULL,
  `nama` varchar(100) DEFAULT NULL,
  `telp` varchar(20) DEFAULT NULL,
  `no_rm` varchar(100) DEFAULT NULL,
  `deskripsi` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `tb_contact`
--

INSERT INTO `tb_contact` (`id`, `nama`, `telp`, `no_rm`, `deskripsi`) VALUES
(9, 'Edi Harianto', '081359474477', '-', '-'),
(12, 'taufik', '085748747597', '-', 'test'),
(15, 'sukardi', '081220380607', '-', 'kontak baru'),
(16, 'Lord Black Samin', '085790325990', '-', '-'),
(17, 'AFIDITA, AN', '087658493021', '000008', 'pasien lama'),
(18, 'sdf', '2342', '-', 'sawe'),
(19, 'JANU, BY', '0851726532', '143672', NULL),
(20, 'HGJHGJHKH, BY', '085445343543', '143673', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `tb_detail_broadcast`
--

CREATE TABLE `tb_detail_broadcast` (
  `id` int(11) NOT NULL,
  `kode` varchar(200) DEFAULT NULL,
  `penerima` varchar(50) DEFAULT NULL,
  `telp` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `tb_detail_broadcast`
--

INSERT INTO `tb_detail_broadcast` (`id`, `kode`, `penerima`, `telp`) VALUES
(20, 'BRC0001', 'Jian Fitri Aprilia', '082245320318'),
(21, 'BRC0001', 'sukardi', '081220380607'),
(22, 'BRC0001', 'taufik', '085748747597'),
(23, 'BRC0002', 'Edi Harianto', '081359474477'),
(24, 'BRC0002', 'Lord Black Samin', '085790325990'),
(25, 'BRC0002', 'taufik', '085748747597'),
(26, 'BRC0003', 'sukardi', '081220380607'),
(27, 'BRC0003', 'taufik', '085748747597'),
(28, 'BRC0003', 'Lord Black Samin', '085790325990');

-- --------------------------------------------------------

--
-- Table structure for table `tb_users`
--

CREATE TABLE `tb_users` (
  `id` int(11) NOT NULL,
  `nama` varchar(200) DEFAULT NULL,
  `username` varchar(200) DEFAULT NULL,
  `password` text DEFAULT NULL,
  `level` varchar(200) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `tb_users`
--

INSERT INTO `tb_users` (`id`, `nama`, `username`, `password`, `level`) VALUES
(1, 'deva satrio', 'deva', '$2b$10$YC5fcXrRPupHjfxPmo9QveHtxdkL.AU70K7Znf/Pt8lL04EQlK7zu', 'Super Admin'),
(6, 'bela aulia', 'bela', '$2b$10$.GnHmABrEnIwFJ2Ap2k8M.bCzgUa0rEmOHWO9Xq8bT.B/mYqDvZdm', 'Super Admin'),
(12, 'admin', 'admin', '$2b$10$ExKOvcBCHTBilZMueAUv7O.L6O7vahPWuipi/0biiQLeUfrk87KYW', 'Admin');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `tb_broadcast`
--
ALTER TABLE `tb_broadcast`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_contact`
--
ALTER TABLE `tb_contact`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_detail_broadcast`
--
ALTER TABLE `tb_detail_broadcast`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `tb_users`
--
ALTER TABLE `tb_users`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `tb_broadcast`
--
ALTER TABLE `tb_broadcast`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `tb_contact`
--
ALTER TABLE `tb_contact`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `tb_detail_broadcast`
--
ALTER TABLE `tb_detail_broadcast`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=29;

--
-- AUTO_INCREMENT for table `tb_users`
--
ALTER TABLE `tb_users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
