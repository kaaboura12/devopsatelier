import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class AppTest {
    
    @Test
    public void testGetMessage() {
        App app = new App();
        String result = app.getMessage();
        assertEquals("Hello World!", result);
    }
    
    @Test
    public void testMainMethod() {
        App.main(new String[]{});
    }
}

