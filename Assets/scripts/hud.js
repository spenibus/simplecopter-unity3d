#pragma strict


/**
TODO
   - visual speed indicator (bars) (forward/up/yaw)
   - engine power indicator
**/


// flight data
private var heloFlightData : flightData;


// flight mechanics
private var heloMechanics : mechanics;


// hud elements
private var hud_cam        : Transform;
private var hud_light      : Transform;
private var hud_aoa        : Transform;
private var hud_aoa_level  : Transform;
private var hud_roll_level : Transform;
private var hud_fpv        : Transform;
private var hud_boresight  : Transform;


private var hud_pitch_reader  : TextMesh;
private var hud_azimuth       : TextMesh;
private var hud_roll_reader   : TextMesh;
private var hud_alt_reader    : TextMesh;
private var hud_speed_reader  : TextMesh;
private var hud_vspeed_reader : TextMesh;


private var flightModelText : UI.Text;


// original position/rotation of hud objects
private var hud_aoa_baseRot        : Quaternion;
private var hud_aoa_level_basePos  : Vector3;
private var hud_roll_level_baseRot : Quaternion;
private var hud_fpv_basePos        : Vector3;


// fpv max angle (stick to screen edges)
private var hud_fpv_angle_max_horizontal : float = 0;
private var hud_fpv_angle_max_vertical   : float = 0;




/******************************************************************************/
function Start() {


   // get mechanics
   heloMechanics = GameObject.Find("helo").transform.GetComponent(mechanics);


   // get flight data
   heloFlightData = GameObject.Find("helo").transform.GetComponent(flightData);


   /**
   set hud camera size depending on main camera fov
   we project relative to the world (pitch levels inaccurate though)
   main square is 90 deg (+/- 45) and 10 units
   1.25 unit covers 45 deg
   **/
   var heloCam = GameObject.Find("helo/cam").GetComponent(Camera);
   var hudCam  = transform.Find("cam").GetComponent(Camera);
   hudCam.orthographicSize = 1.25 * Mathf.Tan(heloCam.fieldOfView / 2 * Mathf.Deg2Rad);


   // get hud objects
   hud_cam        = transform.Find("cam");
   hud_light      = transform.Find("light");
   hud_aoa        = transform.Find("aoa");
   hud_aoa_level  = transform.Find("aoa/level");
   hud_fpv        = transform.Find("fpv");
   hud_boresight  = transform.Find("boresight");
   hud_roll_level = transform.Find("roll/level");


   hud_pitch_reader  = transform.Find("pitch-reader").GetComponent(TextMesh);
   hud_azimuth       = transform.Find("azimuth").GetComponent(TextMesh);
   hud_roll_reader   = transform.Find("roll-reader").GetComponent(TextMesh);
   hud_alt_reader    = transform.Find("alt-reader").GetComponent(TextMesh);
   hud_speed_reader  = transform.Find("speed-reader").GetComponent(TextMesh);
   hud_vspeed_reader = transform.Find("vspeed-reader").GetComponent(TextMesh);


   // get flight model text component
   flightModelText = GameObject.Find("overlayText").Find("flightModel").GetComponent(UI.Text);


   // original pos/rotation of hud objects
   hud_aoa_baseRot        = hud_aoa.localRotation;
   hud_aoa_level_basePos  = hud_aoa_level.localPosition;
   hud_roll_level_baseRot = hud_roll_level.localRotation;
   hud_fpv_basePos        = hud_fpv.localPosition;


   // fpv angle limit (as tan)
   hud_fpv_angle_max_vertical   = Mathf.Tan(heloCam.fieldOfView/2*Mathf.Deg2Rad);
   hud_fpv_angle_max_horizontal = hud_fpv_angle_max_vertical * heloCam.aspect;
}




/******************************************************************************/
function Update() {


   // update hud text
   hud_azimuth.text       = "AZT\n" + (Mathf.Round(heloFlightData.azimuth) % 360).ToString("000");
   hud_pitch_reader.text  = heloFlightData.pitch.ToString("000.00") + " PITCH";
   hud_roll_reader.text   = heloFlightData.roll.ToString("000.00")  + " ROLL ";
   hud_alt_reader.text    = "ALT "  + heloFlightData.altitude.ToString("0000.00");
   hud_speed_reader.text  = "SPD "  + heloFlightData.speed.ToString("000.00");
   hud_vspeed_reader.text = "VSPD " + heloFlightData.speedVertical.ToString("000.00");




   // update flight model text
   flightModelText.text = "flight model:\n"+(heloMechanics.flightModelSimple ? 'simple' : 'advanced');




   // update hud aoa level, apply pitch
   // convert rotation to vertical translation, 1unit = 36deg
   hud_aoa_level.localPosition.y =
      hud_aoa_level_basePos.y - (heloFlightData.pitch / 36);




   // update hud aoa, apply roll
   hud_aoa.localRotation.eulerAngles.z =
      hud_aoa_baseRot.eulerAngles.z + heloFlightData.roll;




   // update hud roll, apply roll
   hud_roll_level.localRotation.eulerAngles.y =
      hud_roll_level_baseRot.eulerAngles.y - heloFlightData.roll;




   // fpv
   var fpvH : float = heloFlightData.fpvHorizontal;
   var fpvV : float = heloFlightData.fpvVertical;

   // limit to 90ish degrees
   fpvH = Mathf.Clamp(fpvH, -89.999, 89.999);
   fpvV = Mathf.Clamp(fpvV, -89.999, 89.999);

   // adapt for screen
   fpvH = Mathf.Tan(fpvH * Mathf.Deg2Rad);
   fpvV = Mathf.Tan(fpvV * Mathf.Deg2Rad);

   // screen angle limit (tan)
   fpvH = Mathf.Clamp(
      fpvH,
      hud_fpv_angle_max_horizontal * -1,
      hud_fpv_angle_max_horizontal
   );
   fpvV = Mathf.Clamp(
      fpvV,
      hud_fpv_angle_max_vertical * -1,
      hud_fpv_angle_max_vertical
   );

   // scale for screen
   fpvH *= 1.25;
   fpvV *= 1.25;

   // apply position
   hud_fpv.localPosition = hud_fpv_basePos + Vector3(fpvH, fpvV, 0);




/**
   // debug fpv visually
   var fpv2       = GameObject.Find("helo").Find("fpv2").transform;
   var fpv2visual = fpv2.Find("visual").transform;
   var vl = heloFlightData.helo.InverseTransformDirection(heloFlightData.helo.rigidbody.velocity).normalized;
   fpv2visual.localPosition = vl;
/**
   print(heloFlightData.fpvVertical+"   "+heloFlightData.fpvHorizontal);
/**/
}