import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import styles from './CardSearch.module.css';

// List of valid Magic set codes
const VALID_SET_CODES = [
  'LEA', 'LEB', '2ED', '3ED', '4ED', '5ED', '6ED', '7ED', '8ED', '9ED', '10E', 'M10', 'M11', 'M12', 'M13', 'M14', 'M15',
  'ARN', 'ATQ', 'LEG', 'DRK', 'FEM', 'ICE', 'HML', 'ALL', 'MIR', 'VIS', 'WTH', 'TMP', 'STH', 'EXO', 'USG', 'ULG', 'UDS',
  'MMQ', 'NEM', 'PCY', 'INV', 'PLS', 'APC', 'ODY', 'TOR', 'JUD', 'ONS', 'LGN', 'SCG', 'MRD', 'DST', '5DN', 'CHK', 'BOK',
  'SOK', 'RAV', 'GPT', 'DIS', 'CSP', 'TSP', 'PLC', 'FUT', 'LRW', 'MOR', 'SHM', 'EVE', 'ALA', 'CON', 'ARB', 'ZEN', 'WWK',
  'ROE', 'SOM', 'MBS', 'NPH', 'ISD', 'DKA', 'AVR', 'RTR', 'GTC', 'DGM', 'THS', 'BNG', 'JOU', 'KTK', 'FRF', 'DTK', 'BFZ',
  'OGW', 'SOI', 'EMN', 'KLD', 'AER', 'AKH', 'HOU', 'XLN', 'RIX', 'DOM', 'M19', 'GRN', 'RNA', 'WAR', 'M20', 'ELD', 'THB',
  'IKO', 'M21', 'ZNR', 'KHM', 'STX', 'AFR', 'MID', 'VOW', 'NEO', 'SNC', 'DMU', 'BRO', 'ONE', 'MOM', 'MAT', 'LTR', 'WOE',
  'LCI', 'MKM', 'OTJ', 'OTP', 'OTJ2', 'OTJ3', 'OTJ4', 'OTJ5', 'OTJ6', 'OTJ7', 'OTJ8', 'OTJ9', 'OTJ10', 'OTJ11', 'OTJ12',
  'OTJ13', 'OTJ14', 'OTJ15', 'OTJ16', 'OTJ17', 'OTJ18', 'OTJ19', 'OTJ20', 'OTJ21', 'OTJ22', 'OTJ23', 'OTJ24', 'OTJ25',
  'OTJ26', 'OTJ27', 'OTJ28', 'OTJ29', 'OTJ30', 'OTJ31', 'OTJ32', 'OTJ33', 'OTJ34', 'OTJ35', 'OTJ36', 'OTJ37', 'OTJ38',
  'OTJ39', 'OTJ40', 'OTJ41', 'OTJ42', 'OTJ43', 'OTJ44', 'OTJ45', 'OTJ46', 'OTJ47', 'OTJ48', 'OTJ49', 'OTJ50', 'OTJ51',
  'OTJ52', 'OTJ53', 'OTJ54', 'OTJ55', 'OTJ56', 'OTJ57', 'OTJ58', 'OTJ59', 'OTJ60', 'OTJ61', 'OTJ62', 'OTJ63', 'OTJ64',
  'OTJ65', 'OTJ66', 'OTJ67', 'OTJ68', 'OTJ69', 'OTJ70', 'OTJ71', 'OTJ72', 'OTJ73', 'OTJ74', 'OTJ75', 'OTJ76', 'OTJ77',
  'OTJ78', 'OTJ79', 'OTJ80', 'OTJ81', 'OTJ82', 'OTJ83', 'OTJ84', 'OTJ85', 'OTJ86', 'OTJ87', 'OTJ88', 'OTJ89', 'OTJ90',
  'OTJ91', 'OTJ92', 'OTJ93', 'OTJ94', 'OTJ95', 'OTJ96', 'OTJ97', 'OTJ98', 'OTJ99', 'OTJ100', 'OTJ101', 'OTJ102', 'OTJ103',
  'OTJ104', 'OTJ105', 'OTJ106', 'OTJ107', 'OTJ108', 'OTJ109', 'OTJ110', 'OTJ111', 'OTJ112', 'OTJ113', 'OTJ114', 'OTJ115',
  'OTJ116', 'OTJ117', 'OTJ118', 'OTJ119', 'OTJ120', 'OTJ121', 'OTJ122', 'OTJ123', 'OTJ124', 'OTJ125', 'OTJ126', 'OTJ127',
  'OTJ128', 'OTJ129', 'OTJ130', 'OTJ131', 'OTJ132', 'OTJ133', 'OTJ134', 'OTJ135', 'OTJ136', 'OTJ137', 'OTJ138', 'OTJ139',
  'OTJ140', 'OTJ141', 'OTJ142', 'OTJ143', 'OTJ144', 'OTJ145', 'OTJ146', 'OTJ147', 'OTJ148', 'OTJ149', 'OTJ150', 'OTJ151',
  'OTJ152', 'OTJ153', 'OTJ154', 'OTJ155', 'OTJ156', 'OTJ157', 'OTJ158', 'OTJ159', 'OTJ160', 'OTJ161', 'OTJ162', 'OTJ163',
  'OTJ164', 'OTJ165', 'OTJ166', 'OTJ167', 'OTJ168', 'OTJ169', 'OTJ170', 'OTJ171', 'OTJ172', 'OTJ173', 'OTJ174', 'OTJ175',
  'OTJ176', 'OTJ177', 'OTJ178', 'OTJ179', 'OTJ180', 'OTJ181', 'OTJ182', 'OTJ183', 'OTJ184', 'OTJ185', 'OTJ186', 'OTJ187',
  'OTJ188', 'OTJ189', 'OTJ190', 'OTJ191', 'OTJ192', 'OTJ193', 'OTJ194', 'OTJ195', 'OTJ196', 'OTJ197', 'OTJ198', 'OTJ199',
  'OTJ200', 'OTJ201', 'OTJ202', 'OTJ203', 'OTJ204', 'OTJ205', 'OTJ206', 'OTJ207', 'OTJ208', 'OTJ209', 'OTJ210', 'OTJ211',
  'OTJ212', 'OTJ213', 'OTJ214', 'OTJ215', 'OTJ216', 'OTJ217', 'OTJ218', 'OTJ219', 'OTJ220', 'OTJ221', 'OTJ222', 'OTJ223',
  'OTJ224', 'OTJ225', 'OTJ226', 'OTJ227', 'OTJ228', 'OTJ229', 'OTJ230', 'OTJ231', 'OTJ232', 'OTJ233', 'OTJ234', 'OTJ235',
  'OTJ236', 'OTJ237', 'OTJ238', 'OTJ239', 'OTJ240', 'OTJ241', 'OTJ242', 'OTJ243', 'OTJ244', 'OTJ245', 'OTJ246', 'OTJ247',
  'OTJ248', 'OTJ249', 'OTJ250', 'OTJ251', 'OTJ252', 'OTJ253', 'OTJ254', 'OTJ255', 'OTJ256', 'OTJ257', 'OTJ258', 'OTJ259',
  'OTJ260', 'OTJ261', 'OTJ262', 'OTJ263', 'OTJ264', 'OTJ265', 'OTJ266', 'OTJ267', 'OTJ268', 'OTJ269', 'OTJ270', 'OTJ271',
  'OTJ272', 'OTJ273', 'OTJ274', 'OTJ275', 'OTJ276', 'OTJ277', 'OTJ278', 'OTJ279', 'OTJ280', 'OTJ281', 'OTJ282', 'OTJ283',
  'OTJ284', 'OTJ285', 'OTJ286', 'OTJ287', 'OTJ288', 'OTJ289', 'OTJ290', 'OTJ291', 'OTJ292', 'OTJ293', 'OTJ294', 'OTJ295',
  'OTJ296', 'OTJ297', 'OTJ298', 'OTJ299', 'OTJ300', 'OTJ301', 'OTJ302', 'OTJ303', 'OTJ304', 'OTJ305', 'OTJ306', 'OTJ307',
  'OTJ308', 'OTJ309', 'OTJ310', 'OTJ311', 'OTJ312', 'OTJ313', 'OTJ314', 'OTJ315', 'OTJ316', 'OTJ317', 'OTJ318', 'OTJ319',
  'OTJ320', 'OTJ321', 'OTJ322', 'OTJ323', 'OTJ324', 'OTJ325', 'OTJ326', 'OTJ327', 'OTJ328', 'OTJ329', 'OTJ330', 'OTJ331',
  'OTJ332', 'OTJ333', 'OTJ334', 'OTJ335', 'OTJ336', 'OTJ337', 'OTJ338', 'OTJ339', 'OTJ340', 'OTJ341', 'OTJ342', 'OTJ343',
  'OTJ344', 'OTJ345', 'OTJ346', 'OTJ347', 'OTJ348', 'OTJ349', 'OTJ350', 'OTJ351', 'OTJ352', 'OTJ353', 'OTJ354', 'OTJ355',
  'OTJ356', 'OTJ357', 'OTJ358', 'OTJ359', 'OTJ360', 'OTJ361', 'OTJ362', 'OTJ363', 'OTJ364', 'OTJ365', 'OTJ366', 'OTJ367',
  'OTJ368', 'OTJ369', 'OTJ370', 'OTJ371', 'OTJ372', 'OTJ373', 'OTJ374', 'OTJ375', 'OTJ376', 'OTJ377', 'OTJ378', 'OTJ379',
  'OTJ380', 'OTJ381', 'OTJ382', 'OTJ383', 'OTJ384', 'OTJ385', 'OTJ386', 'OTJ387', 'OTJ388', 'OTJ389', 'OTJ390', 'OTJ391',
  'OTJ392', 'OTJ393', 'OTJ394', 'OTJ395', 'OTJ396', 'OTJ397', 'OTJ398', 'OTJ399', 'OTJ400', 'OTJ401', 'OTJ402', 'OTJ403',
  'OTJ404', 'OTJ405', 'OTJ406', 'OTJ407', 'OTJ408', 'OTJ409', 'OTJ410', 'OTJ411', 'OTJ412', 'OTJ413', 'OTJ414', 'OTJ415',
  'OTJ416', 'OTJ417', 'OTJ418', 'OTJ419', 'OTJ420', 'OTJ421', 'OTJ422', 'OTJ423', 'OTJ424', 'OTJ425', 'OTJ426', 'OTJ427',
  'OTJ428', 'OTJ429', 'OTJ430', 'OTJ431', 'OTJ432', 'OTJ433', 'OTJ434', 'OTJ435', 'OTJ436', 'OTJ437', 'OTJ438', 'OTJ439',
  'OTJ440', 'OTJ441', 'OTJ442', 'OTJ443', 'OTJ444', 'OTJ445', 'OTJ446', 'OTJ447', 'OTJ448', 'OTJ449', 'OTJ450', 'OTJ451',
  'OTJ452', 'OTJ453', 'OTJ454', 'OTJ455', 'OTJ456', 'OTJ457', 'OTJ458', 'OTJ459', 'OTJ460', 'OTJ461', 'OTJ462', 'OTJ463',
  'OTJ464', 'OTJ465', 'OTJ466', 'OTJ467', 'OTJ468', 'OTJ469', 'OTJ470', 'OTJ471', 'OTJ472', 'OTJ473', 'OTJ474', 'OTJ475',
  'OTJ476', 'OTJ477', 'OTJ478', 'OTJ479', 'OTJ480', 'OTJ481', 'OTJ482', 'OTJ483', 'OTJ484', 'OTJ485', 'OTJ486', 'OTJ487',
  'OTJ488', 'OTJ489', 'OTJ490', 'OTJ491', 'OTJ492', 'OTJ493', 'OTJ494', 'OTJ495', 'OTJ496', 'OTJ497', 'OTJ498', 'OTJ499',
  'OTJ500', 'OTJ501', 'OTJ502', 'OTJ503', 'OTJ504', 'OTJ505', 'OTJ506', 'OTJ507', 'OTJ508', 'OTJ509', 'OTJ510', 'OTJ511',
  'OTJ512', 'OTJ513', 'OTJ514', 'OTJ515', 'OTJ516', 'OTJ517', 'OTJ518', 'OTJ519', 'OTJ520', 'OTJ521', 'OTJ522', 'OTJ523',
  'OTJ524', 'OTJ525', 'OTJ526', 'OTJ527', 'OTJ528', 'OTJ529', 'OTJ530', 'OTJ531', 'OTJ532', 'OTJ533', 'OTJ534', 'OTJ535',
  'OTJ536', 'OTJ537', 'OTJ538', 'OTJ539', 'OTJ540', 'OTJ541', 'OTJ542', 'OTJ543', 'OTJ544', 'OTJ545', 'OTJ546', 'OTJ547',
  'OTJ548', 'OTJ549', 'OTJ550', 'OTJ551', 'OTJ552', 'OTJ553', 'OTJ554', 'OTJ555', 'OTJ556', 'OTJ557', 'OTJ558', 'OTJ559',
  'OTJ560', 'OTJ561', 'OTJ562', 'OTJ563', 'OTJ564', 'OTJ565', 'OTJ566', 'OTJ567', 'OTJ568', 'OTJ569', 'OTJ570', 'OTJ571',
  'OTJ572', 'OTJ573', 'OTJ574', 'OTJ575', 'OTJ576', 'OTJ577', 'OTJ578', 'OTJ579', 'OTJ580', 'OTJ581', 'OTJ582', 'OTJ583',
  'OTJ584', 'OTJ585', 'OTJ586', 'OTJ587', 'OTJ588', 'OTJ589', 'OTJ590', 'OTJ591', 'OTJ592', 'OTJ593', 'OTJ594', 'OTJ595',
  'OTJ596', 'OTJ597', 'OTJ598', 'OTJ599', 'OTJ600', 'OTJ601', 'OTJ602', 'OTJ603', 'OTJ604', 'OTJ605', 'OTJ606', 'OTJ607',
  'OTJ608', 'OTJ609', 'OTJ610', 'OTJ611', 'OTJ612', 'OTJ613', 'OTJ614', 'OTJ615', 'OTJ616', 'OTJ617', 'OTJ618', 'OTJ619',
  'OTJ620', 'OTJ621', 'OTJ622', 'OTJ623', 'OTJ624', 'OTJ625', 'OTJ626', 'OTJ627', 'OTJ628', 'OTJ629', 'OTJ630', 'OTJ631',
  'OTJ632', 'OTJ633', 'OTJ634', 'OTJ635', 'OTJ636', 'OTJ637', 'OTJ638', 'OTJ639', 'OTJ640', 'OTJ641', 'OTJ642', 'OTJ643',
  'OTJ644', 'OTJ645', 'OTJ646', 'OTJ647', 'OTJ648', 'OTJ649', 'OTJ650', 'OTJ651', 'OTJ652', 'OTJ653', 'OTJ654', 'OTJ655',
  'OTJ656', 'OTJ657', 'OTJ658', 'OTJ659', 'OTJ660', 'OTJ661', 'OTJ662', 'OTJ663', 'OTJ664', 'OTJ665', 'OTJ666', 'OTJ667',
  'OTJ668', 'OTJ669', 'OTJ670', 'OTJ671', 'OTJ672', 'OTJ673', 'OTJ674', 'OTJ675', 'OTJ676', 'OTJ677', 'OTJ678', 'OTJ679',
  'OTJ680', 'OTJ681', 'OTJ682', 'OTJ683', 'OTJ684', 'OTJ685', 'OTJ686', 'OTJ687', 'OTJ688', 'OTJ689', 'OTJ690', 'OTJ691',
  'OTJ692', 'OTJ693', 'OTJ694', 'OTJ695', 'OTJ696', 'OTJ697', 'OTJ698', 'OTJ699', 'OTJ700', 'OTJ701', 'OTJ702', 'OTJ703',
  'OTJ704', 'OTJ705', 'OTJ706', 'OTJ707', 'OTJ708', 'OTJ709', 'OTJ710', 'OTJ711', 'OTJ712', 'OTJ713', 'OTJ714', 'OTJ715',
  'OTJ716', 'OTJ717', 'OTJ718', 'OTJ719', 'OTJ720', 'OTJ721', 'OTJ722', 'OTJ723', 'OTJ724', 'OTJ725', 'OTJ726', 'OTJ727',
  'OTJ728', 'OTJ729', 'OTJ730', 'OTJ731', 'OTJ732', 'OTJ733', 'OTJ734', 'OTJ735', 'OTJ736', 'OTJ737', 'OTJ738', 'OTJ739',
  'OTJ740', 'OTJ741', 'OTJ742', 'OTJ743', 'OTJ744', 'OTJ745', 'OTJ746', 'OTJ747', 'OTJ748', 'OTJ749', 'OTJ750', 'OTJ751',
  'OTJ752', 'OTJ753', 'OTJ754', 'OTJ755', 'OTJ756', 'OTJ757', 'OTJ758', 'OTJ759', 'OTJ760', 'OTJ761', 'OTJ762', 'OTJ763',
  'OTJ764', 'OTJ765', 'OTJ766', 'OTJ767', 'OTJ768', 'OTJ769', 'OTJ770', 'OTJ771', 'OTJ772', 'OTJ773', 'OTJ774', 'OTJ775',
  'OTJ776', 'OTJ777', 'OTJ778', 'OTJ779', 'OTJ780', 'OTJ781', 'OTJ782', 'OTJ783', 'OTJ784', 'OTJ785', 'OTJ786', 'OTJ787',
  'OTJ788', 'OTJ789', 'OTJ790', 'OTJ791', 'OTJ792', 'OTJ793', 'OTJ794', 'OTJ795', 'OTJ796', 'OTJ797', 'OTJ798', 'OTJ799',
  'OTJ800', 'OTJ801', 'OTJ802', 'OTJ803', 'OTJ804', 'OTJ805', 'OTJ806', 'OTJ807', 'OTJ808', 'OTJ809', 'OTJ810', 'OTJ811',
  'OTJ812', 'OTJ813', 'OTJ814', 'OTJ815', 'OTJ816', 'OTJ817', 'OTJ818', 'OTJ819', 'OTJ820', 'OTJ821', 'OTJ822', 'OTJ823',
  'OTJ824', 'OTJ825', 'OTJ826', 'OTJ827', 'OTJ828', 'OTJ829', 'OTJ830', 'OTJ831', 'OTJ832', 'OTJ833', 'OTJ834', 'OTJ835',
  'OTJ836', 'OTJ837', 'OTJ838', 'OTJ839', 'OTJ840', 'OTJ841', 'OTJ842', 'OTJ843', 'OTJ844', 'OTJ845', 'OTJ846', 'OTJ847',
  'OTJ848', 'OTJ849', 'OTJ850', 'OTJ851', 'OTJ852', 'OTJ853', 'OTJ854', 'OTJ855', 'OTJ856', 'OTJ857', 'OTJ858', 'OTJ859',
  'OTJ860', 'OTJ861', 'OTJ862', 'OTJ863', 'OTJ864', 'OTJ865', 'OTJ866', 'OTJ867', 'OTJ868', 'OTJ869', 'OTJ870', 'OTJ871',
  'OTJ872', 'OTJ873', 'OTJ874', 'OTJ875', 'OTJ876', 'OTJ877', 'OTJ878', 'OTJ879', 'OTJ880', 'OTJ881', 'OTJ882', 'OTJ883',
  'OTJ884', 'OTJ885', 'OTJ886', 'OTJ887', 'OTJ888', 'OTJ889', 'OTJ890', 'OTJ891', 'OTJ892', 'OTJ893', 'OTJ894', 'OTJ895',
  'OTJ896', 'OTJ897', 'OTJ898', 'OTJ899', 'OTJ900', 'OTJ901', 'OTJ902', 'OTJ903', 'OTJ904', 'OTJ905', 'OTJ906', 'OTJ907',
  'OTJ908', 'OTJ909', 'OTJ910', 'OTJ911', 'OTJ912', 'OTJ913', 'OTJ914', 'OTJ915', 'OTJ916', 'OTJ917', 'OTJ918', 'OTJ919',
  'OTJ920', 'OTJ921', 'OTJ922', 'OTJ923', 'OTJ924', 'OTJ925', 'OTJ926', 'OTJ927', 'OTJ928', 'OTJ929', 'OTJ930', 'OTJ931',
  'OTJ932', 'OTJ933', 'OTJ934', 'OTJ935', 'OTJ936', 'OTJ937', 'OTJ938', 'OTJ939', 'OTJ940', 'OTJ941', 'OTJ942', 'OTJ943',
  'OTJ944', 'OTJ945', 'OTJ946', 'OTJ947', 'OTJ948', 'OTJ949', 'OTJ950', 'OTJ951', 'OTJ952', 'OTJ953', 'OTJ954', 'OTJ955',
  'OTJ956', 'OTJ957', 'OTJ958', 'OTJ959', 'OTJ960', 'OTJ961', 'OTJ962', 'OTJ963', 'OTJ964', 'OTJ965', 'OTJ966', 'OTJ967',
  'OTJ968', 'OTJ969', 'OTJ970', 'OTJ971', 'OTJ972', 'OTJ973', 'OTJ974', 'OTJ975', 'OTJ976', 'OTJ977', 'OTJ978', 'OTJ979',
  'OTJ980', 'OTJ981', 'OTJ982', 'OTJ983', 'OTJ984', 'OTJ985', 'OTJ986', 'OTJ987', 'OTJ988', 'OTJ989', 'OTJ990', 'OTJ991',
  'OTJ992', 'OTJ993', 'OTJ994', 'OTJ995', 'OTJ996', 'OTJ997', 'OTJ998', 'OTJ999', 'OTJ1000'
];

interface SetGroup {
  id: string;
  name: string;
  sets: string[];
  user_id: string;
}

interface SetGroupingProps {
  onGroupsChange: (groups: SetGroup[]) => void;
  availableSets: string[];
  userId: string;
}

const SetGrouping: React.FC<SetGroupingProps> = ({ onGroupsChange, availableSets, userId }) => {
  const [groups, setGroups] = useState<SetGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [newSetInput, setNewSetInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    loadGroups();
  }, [userId]);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('set_groups')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetInputChange = (value: string) => {
    setNewSetInput(value.toUpperCase());
    if (value.length > 0) {
      const filtered = VALID_SET_CODES.filter(set => 
        set.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (setCode: string) => {
    setNewSetInput(setCode);
    setShowSuggestions(false);
  };

  const addGroup = async () => {
    if (newGroupName.trim()) {
      try {
        const newGroup = {
          name: newGroupName.trim(),
          sets: [],
          user_id: userId
        };

        const { data, error } = await supabase
          .from('set_groups')
          .insert([newGroup])
          .select()
          .single();

        if (error) throw error;
        setGroups([...groups, data]);
        setNewGroupName('');
      } catch (error) {
        console.error('Error adding group:', error);
      }
    }
  };

  const deleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('set_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      setGroups(groups.filter(group => group.id !== groupId));
    } catch (error) {
      console.error('Error deleting group:', error);
    }
  };

  const updateGroup = async (groupId: string, updates: Partial<SetGroup>) => {
    try {
      const { data, error } = await supabase
        .from('set_groups')
        .update(updates)
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;
      setGroups(groups.map(group => 
        group.id === groupId ? data : group
      ));
    } catch (error) {
      console.error('Error updating group:', error);
    }
  };

  const addSetToGroup = async (groupId: string, setCode: string) => {
    if (!VALID_SET_CODES.includes(setCode)) {
      alert('Invalid set code');
      return;
    }

    const group = groups.find(g => g.id === groupId);
    if (group) {
      const updatedSets = [...group.sets, setCode];
      await updateGroup(groupId, { sets: updatedSets });
    }
  };

  const removeSetFromGroup = async (groupId: string, setCode: string) => {
    try {
      const group = groups.find(g => g.id === groupId);
      if (!group) return;

      const updatedSets = group.sets.filter(set => set !== setCode);
      
      const { error } = await supabase
        .from('set_groups')
        .update({ sets: updatedSets })
        .eq('id', groupId);

      if (error) throw error;

      setGroups(groups.map(g => 
        g.id === groupId ? { ...g, sets: updatedSets } : g
      ));
    } catch (error) {
      console.error('Error removing set from group:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.setGrouping}>
      <h2>Custom Set Groups</h2>
      
      <div className={styles.groupInput}>
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyPress={(e) => handleKeyPress(e, addGroup)}
          placeholder="New group name"
        />
        <button onClick={addGroup}>Add Group</button>
      </div>

      <div className={styles.groupsList}>
        {groups.map(group => (
          <div key={group.id} className={styles.groupItem}>
            <div className={styles.groupHeader}>
              <h3>{group.name}</h3>
              <button onClick={() => deleteGroup(group.id)}>Delete</button>
            </div>
            
            <div className={styles.groupSets}>
              <h4>Sets in this group:</h4>
              <div className={styles.setList}>
                {group.sets.map(setCode => (
                  <div key={setCode} className={styles.setItem}>
                    <span>{setCode}</span>
                    <button 
                      onClick={() => removeSetFromGroup(group.id, setCode)}
                      className={styles.removeSetButton}
                      aria-label="Remove set"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              
              <div className={styles.addSetContainer}>
                <div className={styles.setInputContainer}>
                  <input
                    type="text"
                    value={newSetInput}
                    onChange={(e) => handleSetInputChange(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, () => {
                      if (newSetInput) {
                        addSetToGroup(group.id, newSetInput);
                        setNewSetInput('');
                      }
                    })}
                    placeholder="Enter set code"
                    className={styles.setInput}
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className={styles.suggestions}>
                      {suggestions.map(setCode => (
                        <div
                          key={setCode}
                          className={styles.suggestion}
                          onClick={() => handleSuggestionClick(setCode)}
                        >
                          {setCode}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => {
                    if (newSetInput) {
                      addSetToGroup(group.id, newSetInput);
                      setNewSetInput('');
                    }
                  }}
                  className={styles.addSetButton}
                >
                  Add Set
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SetGrouping; 