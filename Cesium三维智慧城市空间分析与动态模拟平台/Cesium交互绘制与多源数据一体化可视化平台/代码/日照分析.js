let sunAnalysis=false;
let sunSpeed=1600;//日照速度
let sunSpeedText=document.getElementById('sunSpeedText');
let sunButton=document.getElementById('sunButton')
function F_sunButton()
{
    if(!sunAnalysis)
    {
        sunButton.style.backgroundColor='red';
        
        sunAnalysis=true;
        viewer.shadows=true;
        let dayText=document.getElementById('dayText');
        let startHourText=document.getElementById('startHourText');
        let stopHourText=document.getElementById('stopHourText');
        if(dayText.value==''||startHourText.value==''||stopHourText.value=='')
        {
            alter('请输入日期！')
            return;
        }
        let startTime=new Date(new Date(dayText.value).setHours(Number(startHourText.value)));
        let stopTime=new Date(new Date(dayText.value).setHours(Number(stopHourText.value)));

        viewer.clock.startTime=Cesium.JulianDate.fromDate(startTime);//开始时间
        viewer.clock.stopTime=Cesium.JulianDate.fromDate(stopTime);//结束时间
        viewer.clock.currentTime=Cesium.JulianDate.fromDate(startTime);//当前时间
        viewer.clock.clockRange=Cesium.ClockRange.LOOP_STOP;//范围形式->循环
        viewer.clock.clockStep=Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;//时间速度形式->倍率
        viewer.clock.multiplier=sunSpeed;//时间速度

        viewer.shadows=true;//阴影
        viewer.scene.globe.enableLighting=true;//光照
        viewer.clock.shouldAnimate=true;//时间运行
    }
    else
    {
        sunButton.style.backgroundColor='green';
        sunAnalysis=false;
        viewer.shadows=false;
        viewer.scene.globe.enableLighting=false;
        viewer.clock.shouldAnimate=false;
    }
}
function F_sunSpeedText()
{
    sunSpeed=Number(sunSpeedText.value);
}
